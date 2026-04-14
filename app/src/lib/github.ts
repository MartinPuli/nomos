import type { Agent, AgentMetrics } from "./types";
import { agentQualityScore } from "./pricing";
import { ApiError } from "./http";

const DEFAULT_METRICS: AgentMetrics = {
  avg_tokens_per_task: { simple: 400, moderate: 1200, complex: 2800 },
  tasks_completed: 0,
  tasks_attempted: 0,
  success_rate: 0.75,
};

function gh(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return fetch(`https://api.github.com${path}`, { headers });
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
  if (r.status === 404) {
    throw new ApiError(404, "repo_not_found", `GitHub repository ${owner}/${repo} was not found`);
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

function normalizePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function normalizeNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function normalizeSuccessRate(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : fallback;
}

function normalizeMetrics(value: unknown): AgentMetrics {
  if (!value || typeof value !== "object") return DEFAULT_METRICS;
  const candidate = value as Partial<AgentMetrics>;
  const avg = candidate.avg_tokens_per_task ?? {};
  return {
    avg_tokens_per_task: {
      simple: normalizePositiveNumber(avg.simple, DEFAULT_METRICS.avg_tokens_per_task.simple!),
      moderate: normalizePositiveNumber(avg.moderate, DEFAULT_METRICS.avg_tokens_per_task.moderate!),
      complex: normalizePositiveNumber(avg.complex, DEFAULT_METRICS.avg_tokens_per_task.complex!),
    },
    tasks_completed: normalizeNonNegativeNumber(candidate.tasks_completed, DEFAULT_METRICS.tasks_completed),
    tasks_attempted: normalizeNonNegativeNumber(candidate.tasks_attempted, DEFAULT_METRICS.tasks_attempted),
    success_rate: normalizeSuccessRate(candidate.success_rate, DEFAULT_METRICS.success_rate),
  };
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

export async function registerFromGithub(url: string): Promise<Agent> {
  const { owner, repo } = parseGithubUrl(url);
  const [skillsMd, metricsJson, commits90d] = await Promise.all([
    fetchFile(owner, repo, "skills.md"),
    fetchFile(owner, repo, "memory/metrics.json"),
    commitsLast90d(owner, repo),
  ]);

  const skills =
    skillsMd && parseSkills(skillsMd).length > 0
      ? parseSkills(skillsMd)
      : ["general"];
  let metrics: AgentMetrics = DEFAULT_METRICS;
  if (metricsJson) {
    try {
      metrics = normalizeMetrics(JSON.parse(metricsJson));
    } catch {
      metrics = DEFAULT_METRICS;
    }
  }

  const skills_count = skills.length;
  const quality = agentQualityScore(
    skills_count,
    commits90d,
    metrics.success_rate,
  );

  return {
    id: `${owner}-${repo}`.toLowerCase(),
    name: repo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    handle: `@${owner}/${repo}`,
    description: `Registered from github.com/${owner}/${repo}`,
    source: "github",
    skills,
    default_tier: "moderate",
    github_url: `https://github.com/${owner}/${repo}`,
    metrics,
    skills_count,
    commits_90d: commits90d,
    quality,
    created_at: new Date().toISOString(),
  };
}
