import type { Agent, AgentMetrics, AgentRegistrationInput, Tier } from "./types";
import { agentQualityScore } from "./pricing";
import { ApiError } from "./http";

const VALID_TIERS: readonly Tier[] = ["simple", "moderate", "complex"];

function gh(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  // no-store: GitHub file contents change between pushes; never serve stale cache
  return fetch(`https://api.github.com${path}`, { headers, cache: "no-store" });
}

function parseGithubUrl(url: string): { owner: string; repo: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(400, "invalid_github_url", `invalid GitHub URL: ${url}`);
  }

  if (!["github.com", "www.github.com"].includes(parsed.hostname)) {
    throw new ApiError(400, "invalid_github_url", "GitHub URL must point to github.com");
  }

  const parts = parsed.pathname.replace(/\.git$/, "").split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new ApiError(400, "invalid_github_url", `invalid GitHub URL: ${url}`);
  }

  return { owner: parts[0], repo: parts[1] };
}

async function fetchFile(
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  const r = await gh(`/repos/${owner}/${repo}/contents/${path}`);
  if (r.status === 404) return null;
  if (r.status === 403 || r.status === 429) {
    throw new ApiError(
      502,
      "github_rate_limited",
      "GitHub API rate-limited or forbidden. Set GITHUB_TOKEN or try again later.",
    );
  }
  if (!r.ok) {
    throw new ApiError(
      502,
      "github_api_error",
      `GitHub API request failed while reading ${path}`,
    );
  }
  const j = (await r.json()) as { content: string; encoding: string };
  if (j.encoding !== "base64") return null;
  return Buffer.from(j.content, "base64").toString("utf-8");
}

async function commitsLast90d(owner: string, repo: string): Promise<number> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const r = await gh(
    `/repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}&per_page=100`,
  );
  // 422 instead of 404 so the API response isn't mistaken for a missing route
  if (r.status === 404) {
    throw new ApiError(422, "repo_not_found", `GitHub repository ${owner}/${repo} was not found`);
  }
  if (r.status === 403 || r.status === 429) {
    throw new ApiError(
      502,
      "github_rate_limited",
      "GitHub API rate-limited or forbidden. Set GITHUB_TOKEN or try again later.",
    );
  }
  if (!r.ok) {
    throw new ApiError(
      502,
      "github_api_error",
      `GitHub API request failed while reading commits for ${owner}/${repo}`,
    );
  }
  const arr = (await r.json()) as unknown[];
  return Array.isArray(arr) ? arr.length : 0;
}

function parseSkills(md: string): string[] {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^[-*]\s+([a-zA-Z0-9_\- ]{2,40})\s*$/);
    if (m) out.push(m[1].trim().toLowerCase().replace(/\s+/g, "_"));
  }
  return out.slice(0, 20);
}

interface StrictManifest {
  avg_tokens_per_task: { simple: number; moderate: number; complex: number };
  tasks_completed: number;
  tasks_attempted: number;
  success_rate: number;
  default_tier: Tier;
}

function requirePositiveNumber(obj: Record<string, unknown>, field: string, hint: string): number {
  const v = obj[field];
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    throw new ApiError(422, "manifest_invalid_metrics",
      `memory/metrics.json: "${field}" must be a positive number — ${hint}`);
  }
  return v;
}

function requireNonNegativeInt(obj: Record<string, unknown>, field: string): number {
  const v = obj[field];
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new ApiError(422, "manifest_invalid_metrics",
      `memory/metrics.json: "${field}" must be a non-negative integer`);
  }
  return v;
}

function parseStrictManifest(raw: unknown): StrictManifest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ApiError(422, "manifest_invalid_metrics",
      `memory/metrics.json must be a JSON object`);
  }
  const m = raw as Record<string, unknown>;

  // default_tier
  if (!m.default_tier || !VALID_TIERS.includes(m.default_tier as Tier)) {
    throw new ApiError(422, "manifest_invalid_metrics",
      `memory/metrics.json: "default_tier" must be one of "simple" | "moderate" | "complex"`);
  }

  // avg_tokens_per_task
  if (!m.avg_tokens_per_task || typeof m.avg_tokens_per_task !== "object" || Array.isArray(m.avg_tokens_per_task)) {
    throw new ApiError(422, "manifest_invalid_metrics",
      `memory/metrics.json: "avg_tokens_per_task" must be an object with keys simple, moderate, complex (each a positive number)`);
  }
  const apt = m.avg_tokens_per_task as Record<string, unknown>;
  const simple   = requirePositiveNumber(apt, "simple",   'e.g. { "simple": 300, "moderate": 900, "complex": 2400 }');
  const moderate = requirePositiveNumber(apt, "moderate", 'e.g. { "simple": 300, "moderate": 900, "complex": 2400 }');
  const complex  = requirePositiveNumber(apt, "complex",  'e.g. { "simple": 300, "moderate": 900, "complex": 2400 }');

  // tasks_completed and tasks_attempted
  const tasks_completed = requireNonNegativeInt(m, "tasks_completed");
  const tasks_attempted = requireNonNegativeInt(m, "tasks_attempted");
  if (tasks_attempted < tasks_completed) {
    throw new ApiError(422, "manifest_invalid_metrics",
      `memory/metrics.json: "tasks_attempted" (${tasks_attempted}) must be >= "tasks_completed" (${tasks_completed})`);
  }

  // success_rate
  const sr = m.success_rate;
  if (typeof sr !== "number" || !Number.isFinite(sr) || sr < 0 || sr > 1) {
    throw new ApiError(422, "manifest_invalid_metrics",
      `memory/metrics.json: "success_rate" must be a number between 0 and 1 inclusive`);
  }

  return {
    avg_tokens_per_task: { simple, moderate, complex },
    tasks_completed,
    tasks_attempted,
    success_rate: sr,
    default_tier: m.default_tier as Tier,
  };
}

export async function registerFromGithub(
  input: AgentRegistrationInput,
): Promise<Agent> {
  const { owner, repo } = parseGithubUrl(input.github_url);
  const [skillsMd, metricsJson, commits90d] = await Promise.all([
    fetchFile(owner, repo, "skills.md"),
    fetchFile(owner, repo, "memory/metrics.json"),
    commitsLast90d(owner, repo),
  ]);

  // Strict skills.md validation
  if (skillsMd === null) {
    throw new ApiError(422, "manifest_missing_skills_md",
      `${owner}/${repo} is missing skills.md — create it at the repo root with bullet-listed skills (e.g. "- typescript")`);
  }
  const parsedSkills = parseSkills(skillsMd);
  if (parsedSkills.length === 0) {
    throw new ApiError(422, "manifest_empty_skills",
      `skills.md in ${owner}/${repo} has no parseable skills — each skill must be a bullet line starting with "- " or "* " (2–40 chars)`);
  }

  // Strict memory/metrics.json validation
  if (metricsJson === null) {
    throw new ApiError(422, "manifest_missing_metrics_json",
      `${owner}/${repo} is missing memory/metrics.json — create it with: default_tier, avg_tokens_per_task, tasks_completed, tasks_attempted, success_rate`);
  }
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(metricsJson);
  } catch {
    throw new ApiError(422, "manifest_invalid_json",
      `memory/metrics.json in ${owner}/${repo} is not valid JSON`);
  }
  const manifest = parseStrictManifest(rawParsed);

  const skills = Array.from(
    new Set([...parsedSkills, ...(input.extra_skills ?? [])]),
  ).slice(0, 30);

  const metrics: AgentMetrics = {
    avg_tokens_per_task: manifest.avg_tokens_per_task,
    tasks_completed: manifest.tasks_completed,
    tasks_attempted: manifest.tasks_attempted,
    success_rate: manifest.success_rate,
  };

  const skills_count = skills.length;
  const quality = agentQualityScore(skills_count, commits90d, manifest.success_rate);

  const defaultName = repo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: `${owner}-${repo}`.toLowerCase(),
    name: input.name ?? defaultName,
    handle: input.handle ?? `@${owner}/${repo}`,
    description: input.tagline ?? `Registered from github.com/${owner}/${repo}`,
    source: "github",
    skills,
    default_tier: manifest.default_tier,
    github_url: `https://github.com/${owner}/${repo}`,
    metrics,
    skills_count,
    commits_90d: commits90d,
    quality,
    created_at: new Date().toISOString(),
    tagline: input.tagline,
    specialty: input.specialty,
    rent_price_eth_per_task: input.rent_price_eth_per_task,
    maintainer_email: input.maintainer_email,
    wallet_eth: input.wallet_eth,
    team_ready: input.team_ready ?? true,
  };
}
