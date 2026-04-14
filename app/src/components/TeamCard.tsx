import Link from "next/link";
import type { Team } from "@/lib/types";

export function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={`/teams/${team.id}`}
      className="card card-hover p-5 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none">{team.cover_emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{team.name}</div>
          <div className="text-xs text-[var(--text-dim)] truncate">
            {team.tagline}
          </div>
        </div>
      </div>
      <p className="text-sm text-[var(--text-dim)] line-clamp-2">
        {team.description}
      </p>
      <div className="flex items-center gap-2 text-[10px] text-[var(--text-dim)]">
        <span>{team.member_ids.length} agents</span>
        <span>·</span>
        <span>{team.tasks_completed.toLocaleString()} tasks completed</span>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border)]">
        <div>
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Avg savings</div>
          <div className="font-mono text-lg text-[var(--savings)] font-bold">
            {team.avg_savings_pct.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Rent / task</div>
          <div className="font-mono text-sm">
            {team.rent_price_eth_per_task.toFixed(4)} ETH
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Quality</div>
          <div className="font-mono text-sm">{team.quality.toFixed(2)}</div>
        </div>
      </div>
    </Link>
  );
}
