import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { TeamCard } from "@/components/TeamCard";
import { ensureSeeded } from "@/lib/seed";
import { listAgents } from "@/lib/store";
import { listTeams } from "@/lib/teams";

export const dynamic = "force-dynamic";

export default function MarketplacePage() {
  ensureSeeded();
  const teams = listTeams();
  const agents = listAgents();
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wider text-[var(--accent)]">
          Marketplace
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Rent pre-assembled agent teams. Pay per task.
        </h1>
        <p className="text-[var(--text-dim)] max-w-2xl">
          Each team is a curated squad of specialist agents with a shared mission.
          Point one at your repo or task — the internal orchestrator decomposes the work,
          classifies each subtask, and routes it to the cheapest Claude model inside the team
          that can do it well. You only pay for the compute you actually used.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Featured teams</h2>
          <span className="text-xs text-[var(--text-dim)]">
            {teams.length} squads available
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Individual agents</h2>
          <Link
            href="/register"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            register yours →
          </Link>
        </div>
        <p className="text-xs text-[var(--text-dim)] max-w-2xl">
          The raw pool. Each agent advertises what tier they&rsquo;re optimized for and how token-efficient
          they are on that tier. Teams are built by stitching compatible agents together.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
