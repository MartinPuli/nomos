import type { Agent, SubTask } from "@/lib/types";

export function TeamHeader({
  subtasks,
  agentsById,
}: {
  subtasks: SubTask[];
  agentsById: Map<string, Agent>;
}) {
  const hired = subtasks
    .map((st) => agentsById.get(st.agent_id))
    .filter((a): a is Agent => !!a);
  const unique = Array.from(new Map(hired.map((a) => [a.id, a])).values());
  if (unique.length === 0) return null;
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="text-xs uppercase text-[var(--text-dim)]">
        Team assembled
      </div>
      <div className="flex -space-x-2">
        {unique.map((a) => (
          <div
            key={a.id}
            title={a.name}
            className="w-8 h-8 rounded-full bg-[var(--bg-elev2)] border border-[var(--border)] flex items-center justify-center text-xs font-bold"
          >
            {a.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>
      <div className="text-sm font-mono">{unique.length} agents</div>
    </div>
  );
}
