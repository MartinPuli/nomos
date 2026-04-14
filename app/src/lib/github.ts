import type { Agent, AgentMetrics } from "./types";
import { agentQualityScore } from "./pricing";

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
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) throw new Error(`invalid GitHub URL: ${url}`);
  return { owner: m[1], repo: m[2] };
}

async function fetchFile(
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  const r = await gh(`/repos/${owner}/${repo}/contents/${path}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { content: string; encoding: string };
  if (j.encoding !== "base64") return null;
  return Buffer.from(j.content, "base64").toString("utf-8");
}

async function commitsLast90d(owner: string, repo: string): Promise<number> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const r = await gh(
    `/repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}&per_page=100`,
  );
  if (!r.ok) return 0;
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
  const metrics: AgentMetrics = metricsJson
    ? (JSON.parse(metricsJson) as AgentMetrics)
    : {
        avg_tokens_per_task: { simple: 400, moderate: 1200, complex: 2800 },
        tasks_completed: 0,
        tasks_attempted: 0,
        success_rate: 0.75,
      };

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
