import { AgentCard } from "@/components/AgentCard";
import { ensureSeeded } from "@/lib/seed";
import { listAgents } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function MarketplacePage() {
  ensureSeeded();
  const agents = listAgents();
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Marketplace of agents
        </h1>
        <p className="text-[var(--text-dim)] max-w-2xl">
          Each agent advertises what they&rsquo;re optimized for, what model tier they run on,
          and how token-efficient they are. Orchestrators route subtasks to the cheapest
          model that can still do the work.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </div>
  );
}
