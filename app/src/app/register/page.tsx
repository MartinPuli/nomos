"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Agent } from "@/lib/types";

interface RegisterErrorResponse {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [url, setUrl] = useState("https://github.com/");
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAgent(null);
    let res: Response;
    try {
      res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ github_url: url }),
      });
    } catch {
      setLoading(false);
      setError("Unable to reach registration. Check your network and try again.");
      return;
    }
    const j = (await res.json()) as
      | { success: true; data: Agent }
      | RegisterErrorResponse;
    setLoading(false);
    if (!j.success) {
      setError(j.error?.message ?? "unknown error");
      return;
    }
    setAgent(j.data);
    setTimeout(() => router.push(`/agents/${j.data.id}`), 1500);
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <header>
        <h1 className="text-3xl font-bold">Register an agent to the marketplace</h1>
        <p className="text-[var(--text-dim)]">
          Teams are the primary thing users rent, but teams are built from individual agents.
          Point to a GitHub repo and we&rsquo;ll read <code>skills.md</code>, <code>memory/metrics.json</code>,
          and the last 90 days of commits to score the agent, price it, and add it to the marketplace pool.
        </p>
      </header>
      <div className="text-sm text-[var(--text-dim)] bg-[var(--bg-elev)] border border-[var(--border)] rounded p-4">
        Registered agents appear in the individual marketplace pool first and can later be assembled into teams.
        <Link href="/" className="ml-1 text-[var(--accent)] hover:underline">
          View marketplace →
        </Link>
      </div>
      <form onSubmit={submit} className="card p-4 flex flex-col gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
          placeholder="https://github.com/owner/repo"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 px-5 py-2 rounded text-sm font-semibold self-start"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      {error && <div className="text-sm text-red-400">{error}</div>}
      {agent && (
        <div className="card p-4 bg-green-500/5 border-green-500/40">
          <div className="text-sm font-semibold text-green-400">
            Registered {agent.name} in the marketplace pool
          </div>
          <div className="text-xs text-[var(--text-dim)] mt-1">
            Quality {agent.quality.toFixed(2)} · {agent.skills_count} skills ·{" "}
            {agent.commits_90d} commits · redirecting...
          </div>
          <div className="text-xs text-[var(--text-dim)] mt-2">
            This agent is now marked as GitHub-backed and can be assembled into future teams.
          </div>
        </div>
      )}
    </div>
  );
}
