import Link from "next/link";
import type { Agent } from "@/lib/types";
import { TierBadge } from "./TierBadge";

export function AgentCard({ agent }: { agent: Agent }) {
  const moderateAvg =
    agent.metrics.avg_tokens_per_task[agent.default_tier] ?? 1000;
  const sourceLabel = agent.source === "github" ? "GitHub" : "Fixture";
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="card card-hover p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{agent.name}</div>
          <div className="text-xs text-[var(--text-dim)]">{agent.handle}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <TierBadge tier={agent.default_tier} />
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
            {sourceLabel}
          </span>
        </div>
      </div>
      <p className="text-sm text-[var(--text-dim)] line-clamp-2">
        {agent.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {agent.skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="text-[10px] bg-[var(--bg-elev2)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-dim)]"
          >
            {s.replace(/_/g, " ")}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--border)] text-xs">
        <div>
          <div className="text-[var(--text-dim)]">Avg tokens</div>
          <div className="font-mono text-sm">{moderateAvg.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[var(--text-dim)]">Success</div>
          <div className="font-mono text-sm">
            {(agent.metrics.success_rate * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-[var(--text-dim)]">Quality</div>
          <div className="font-mono text-sm">{agent.quality.toFixed(2)}</div>
        </div>
      </div>
    </Link>
  );
}
