import { notFound } from "next/navigation";
import Link from "next/link";
import { TierBadge } from "@/components/TierBadge";
import { ensureSeeded } from "@/lib/seed";
import { getAgent } from "@/lib/store";
import { MODEL_RATES, taskPriceEth } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AgentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureSeeded();
  const { id } = await params;
  const agent = getAgent(id);
  if (!agent) notFound();

  const tiers: Array<"simple" | "moderate" | "complex"> = [
    "simple",
    "moderate",
    "complex",
  ];
  const sourceLabel = agent.source === "github" ? "GitHub-backed agent" : "Fixture agent";
  const completionRate =
    agent.metrics.tasks_attempted > 0
      ? (agent.metrics.tasks_completed / agent.metrics.tasks_attempted) * 100
      : agent.metrics.success_rate * 100;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-[var(--text-dim)] hover:text-white">
        ← back to marketplace
      </Link>
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-[var(--accent)] mb-2">
            {sourceLabel}
          </div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <div className="text-sm text-[var(--text-dim)]">{agent.handle}</div>
          {agent.github_url && (
            <a
              href={agent.github_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {agent.github_url}
            </a>
          )}
        </div>
        <TierBadge tier={agent.default_tier} size="md" />
      </header>

      <p className="text-[var(--text-dim)]">{agent.description}</p>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 flex flex-col gap-2">
          <div className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
            Source
          </div>
          <div className="font-semibold">{sourceLabel}</div>
          <div className="text-sm text-[var(--text-dim)]">
            {agent.source === "github"
              ? "Imported from a live GitHub repository with repo activity and metrics signals."
              : "Curated fixture data used to seed the marketplace and demo flows."}
          </div>
        </div>
        <div className="card p-4 flex flex-col gap-2">
          <div className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
            Throughput
          </div>
          <div className="font-semibold">
            {agent.metrics.tasks_completed.toLocaleString()} completed / {agent.metrics.tasks_attempted.toLocaleString()} attempted
          </div>
          <div className="text-sm text-[var(--text-dim)]">
            Effective completion rate {completionRate.toFixed(0)}%
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
          Skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {agent.skills.map((s) => (
            <span
              key={s}
              className="text-xs bg-[var(--bg-elev2)] border border-[var(--border)] rounded px-2 py-1"
            >
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const avg = agent.metrics.avg_tokens_per_task[tier];
          if (!avg) return null;
          const model = tier === "simple" ? "haiku" : tier === "moderate" ? "sonnet" : "opus";
          const price = taskPriceEth(model, avg, agent.quality);
          return (
            <div key={tier} className="card p-4 flex flex-col gap-2">
              <TierBadge tier={tier} />
              <div className="text-xs text-[var(--text-dim)]">Avg tokens</div>
              <div className="font-mono text-lg">{avg.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-dim)] pt-2 border-t border-[var(--border)]">
                Est. price / task
              </div>
              <div className="font-mono text-sm">{price.toFixed(6)} ETH</div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-[var(--text-dim)]">Success rate</div>
          <div className="font-mono text-2xl">
            {(agent.metrics.success_rate * 100).toFixed(0)}%
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--text-dim)]">Commits 90d</div>
          <div className="font-mono text-2xl">{agent.commits_90d}</div>
          <div className="text-xs text-[var(--text-dim)] mt-1">
            Maintenance signal from source repo
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--text-dim)]">Quality score</div>
          <div className="font-mono text-2xl">{agent.quality.toFixed(2)}</div>
        </div>
      </section>

      <section className="text-xs text-[var(--text-dim)] border-t border-[var(--border)] pt-4">
        Base rates — Haiku {MODEL_RATES.haiku.toFixed(8)} ETH/token · Sonnet{" "}
        {MODEL_RATES.sonnet.toFixed(8)} ETH/token · Opus{" "}
        {MODEL_RATES.opus.toFixed(8)} ETH/token
      </section>
    </div>
  );
}
