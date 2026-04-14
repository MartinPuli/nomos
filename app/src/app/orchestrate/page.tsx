"use client";

import { useEffect, useMemo, useState } from "react";
import { SavingsPanel } from "@/components/SavingsPanel";
import { TaskRow } from "@/components/TaskRow";
import { TeamHeader } from "@/components/TeamHeader";
import type { Agent, OrchestrationEvent, SubTask } from "@/lib/types";

const DEFAULT_GOAL =
  "Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes: 'How much? Monthly. Cancel anytime. Who owns data? Customer does. Refunds? 30-day. Enterprise? Yes.'";

export default function OrchestratePage() {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [totals, setTotals] = useState({
    naive: 0,
    actual: 0,
    savedPct: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((j) => setAgents(j.data ?? []));
  }, []);

  const agentsById = useMemo(
    () => new Map(agents.map((a) => [a.id, a])),
    [agents],
  );

  async function run() {
    setSubtasks([]);
    setTotals({ naive: 0, actual: 0, savedPct: 0 });
    setRunning(true);
    setFinished(false);
    setError(null);

    const res = await fetch("/api/orchestrate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    if (!res.ok || !res.body) {
      setError("orchestrate request failed");
      setRunning(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        const json = line.replace(/^data:\s*/, "");
        const ev = JSON.parse(json) as OrchestrationEvent;
        setSubtasks((prev) => applyEvent(prev, ev));
        if (ev.type === "run_completed") {
          setTotals({
            naive: ev.total_naive_eth,
            actual: ev.total_actual_eth,
            savedPct: ev.saved_pct,
          });
          setFinished(true);
        } else if (ev.type === "error") {
          setError(ev.message);
        }
      }
    }
    setRunning(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Orchestrate</h1>
        <p className="text-[var(--text-dim)] max-w-2xl">
          Give the orchestrator a goal. It will decompose it into subtasks,
          classify each by complexity, route to the cheapest Claude model that
          can do it well, and hire an agent from the marketplace.
        </p>
      </header>

      <div className="card p-4 flex flex-col gap-3">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={4}
          className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm font-mono resize-none focus:outline-none focus:border-[var(--accent)]"
          placeholder="Describe your goal..."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={running || !goal.trim()}
            className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 px-5 py-2 rounded text-sm font-semibold"
          >
            {running ? "Running..." : "Run orchestrator"}
          </button>
          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>
      </div>

      {subtasks.length > 0 && (
        <SavingsPanel
          naive={totals.naive}
          actual={totals.actual}
          savedPct={totals.savedPct}
          live={running && !finished}
        />
      )}

      {subtasks.length > 0 && (
        <TeamHeader subtasks={subtasks} agentsById={agentsById} />
      )}

      <div className="flex flex-col gap-3">
        {subtasks.map((st) => (
          <TaskRow key={st.id} task={st} agent={agentsById.get(st.agent_id)} />
        ))}
      </div>
    </div>
  );
}

function applyEvent(prev: SubTask[], ev: OrchestrationEvent): SubTask[] {
  switch (ev.type) {
    case "decomposed":
      return ev.subtasks;
    case "classified":
      return prev.map((st) =>
        st.id === ev.subtask_id
          ? {
              ...st,
              classification: ev.classification,
              tier: ev.classification.tier,
              model: ev.model,
              status: "routed",
            }
          : st,
      );
    case "agent_assigned":
      return prev.map((st) =>
        st.id === ev.subtask_id ? { ...st, agent_id: ev.agent_id } : st,
      );
    case "task_started":
      return prev.map((st) =>
        st.id === ev.subtask_id ? { ...st, status: "working" } : st,
      );
    case "task_completed":
      return prev.map((st) =>
        st.id === ev.subtask_id
          ? {
              ...st,
              status: "done",
              actual_tokens: ev.actual_tokens,
              cost_eth: ev.cost_eth,
              output: ev.output,
            }
          : st,
      );
    case "task_failed":
      return prev.map((st) =>
        st.id === ev.subtask_id ? { ...st, status: "error", error: ev.error } : st,
      );
    default:
      return prev;
  }
}
