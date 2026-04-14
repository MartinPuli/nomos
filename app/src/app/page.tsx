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
          Rent specialist teams that route work to the cheapest model that fits.
        </h1>
        <p className="text-[var(--text-dim)] max-w-2xl">
          Nomos is a compute-routed marketplace. The primary unit you rent is a team:
          a curated squad of specialist agents with a shared mission. Give a team a goal and its
          internal orchestrator decomposes the work, classifies each subtask, and routes it to the
          cheapest Claude model that can still do it well. Individual agents still exist as the raw
          marketplace supply that teams are assembled from.
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
            add one to the marketplace →
          </Link>
        </div>
        <p className="text-xs text-[var(--text-dim)] max-w-2xl">
          This is the underlying supply layer. Each agent advertises what tier they&rsquo;re optimized for,
          which skills they bring, and how token-efficient they are on that tier. Teams are composed
          from this pool and remain the main thing customers rent.
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
