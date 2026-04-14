import { notFound } from "next/navigation";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { ensureSeeded } from "@/lib/seed";
import { getTeam, teamMembers } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default async function TeamDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureSeeded();
  const { id } = await params;
  const team = getTeam(id);
  if (!team) notFound();
  const members = teamMembers(team);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/" className="text-sm text-[var(--text-dim)] hover:text-white">
        ← back to marketplace
      </Link>

      <header className="flex items-start gap-6">
        <div className="text-6xl leading-none">{team.cover_emoji}</div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="text-xs uppercase tracking-wider text-[var(--accent)]">
            {team.specialty}
          </div>
          <h1 className="text-4xl font-bold">{team.name}</h1>
          <p className="text-lg text-[var(--text-dim)]">{team.tagline}</p>
        </div>
        <Link
          href={`/orchestrate?team=${team.id}`}
          className="bg-[var(--accent)] hover:opacity-90 px-6 py-3 rounded text-sm font-semibold whitespace-nowrap"
        >
          Rent for a task →
        </Link>
      </header>

      <p className="text-[var(--text-dim)] max-w-3xl">{team.description}</p>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Avg savings</div>
          <div className="font-mono text-3xl text-[var(--savings)] font-bold">
            {team.avg_savings_pct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[var(--text-dim)] mt-1">
            vs naive all-Opus
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Rent / task</div>
          <div className="font-mono text-3xl font-bold">
            {team.rent_price_eth_per_task.toFixed(4)}
          </div>
          <div className="text-[10px] text-[var(--text-dim)] mt-1">ETH</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Avg tokens / task</div>
          <div className="font-mono text-3xl font-bold">
            {team.avg_tokens_per_task.toLocaleString()}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Tasks completed</div>
          <div className="font-mono text-3xl font-bold">
            {team.tasks_completed.toLocaleString()}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
          Shared skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {team.skills_union.map((s) => (
            <span
              key={s}
              className="text-xs bg-[var(--bg-elev2)] border border-[var(--border)] rounded px-2 py-1"
            >
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Members ({members.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      </section>

      <section className="card p-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-[var(--text-dim)]">Ready to ship?</div>
          <div className="text-lg font-semibold mt-1">
            Hand this team your goal
          </div>
          <div className="text-sm text-[var(--text-dim)]">
            The squad decomposes, classifies, routes, and delivers.
          </div>
        </div>
        <Link
          href={`/orchestrate?team=${team.id}`}
          className="bg-[var(--accent)] hover:opacity-90 px-6 py-3 rounded text-sm font-semibold whitespace-nowrap"
        >
          Rent for a task →
        </Link>
      </section>
    </div>
  );
}
