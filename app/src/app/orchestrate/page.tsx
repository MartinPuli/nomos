"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExecutionStepper } from "@/components/ExecutionStepper";
import { SavingsPanel } from "@/components/SavingsPanel";
import { TaskRow } from "@/components/TaskRow";
import { TeamHeader } from "@/components/TeamHeader";
import type { Agent, OrchestrationEvent, SubTask, Team } from "@/lib/types";

const DEFAULT_GOAL =
  "Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes: 'How much? Monthly. Cancel anytime. Who owns data? Customer does. Refunds? 30-day. Enterprise? Yes.'";

const DEMO_PRESETS = [
  {
    label: "Launch demo",
    value: DEFAULT_GOAL,
  },
  {
    label: "Architecture memo",
    value:
      "Evaluate a B2B analytics platform: analyze the ingestion architecture, propose a pricing and packaging model, and rewrite the customer-facing summary for the launch memo.",
  },
  {
    label: "Content ops",
    value:
      "Turn these product notes into a multilingual FAQ, summarize the support issues into 5 bullet insights, and draft a short launch thread for social channels.",
  },
];

interface TeamDetailResponse {
  team: Team;
  members: Agent[];
}

interface ApiErrorResponse {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
}

function OrchestrateInner() {
  const params = useSearchParams();
  const teamId = params.get("team");
  const goalParam = params.get("goal");
  const mode = teamId ? "team" : "marketplace";

  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [totals, setTotals] = useState({ naive: 0, actual: 0, savedPct: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goalParam?.trim()) {
      setGoal(goalParam);
    }
  }, [goalParam]);

  useEffect(() => {
    if (teamId) {
      fetch(`/api/teams/${teamId}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.success) {
            const data = j.data as TeamDetailResponse;
            setTeam(data.team);
            setAgents(data.members);
          }
        });
    } else {
      fetch("/api/agents")
        .then((r) => r.json())
        .then((j) => setAgents(j.data ?? []));
    }
  }, [teamId]);

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

    let res: Response;
    try {
      res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal, team_id: teamId ?? undefined }),
      });
    } catch {
      setError("Unable to reach the orchestrator. Check your network and try again.");
      setRunning(false);
      return;
    }
    if (!res.ok || !res.body) {
      let message = "orchestrate request failed";
      try {
        const payload = (await res.json()) as ApiErrorResponse;
        message = payload.error?.message ?? message;
      } catch {
        // Keep the fallback message when the response is not JSON.
      }
      setError(message);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <header style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span
          style={{
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.28em",
            color: "var(--ink)",
            fontWeight: 600,
          }}
        >
          § hire execution
        </span>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(2rem, 5vw, 3rem)",
            color: "var(--ink)",
            margin: 0,
            lineHeight: 1.15,
            letterSpacing: "0.005em",
          }}
        >
          Route your goal.
        </h1>
        <p style={{ color: "var(--text-dim)", maxWidth: "620px", lineHeight: 1.65, fontSize: "0.9375rem", margin: 0 }}>
          Choose how you want to hire: from the open marketplace pool or from one specific team. Either way, Nomos decomposes the goal, classifies the work, and routes every task to the cheapest model that can do it well.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="card"
          style={{
            padding: "20px",
            background: mode === "marketplace" ? "var(--terere-soft)" : "var(--bg-elev)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.24em", color: "var(--ink)", fontWeight: 600 }}>
            01 / marketplace mode
          </div>
          <div
            className="font-display"
            style={{ fontSize: "1.25rem", color: "var(--ink)", lineHeight: 1, letterSpacing: "0.005em" }}
          >
            Hire from the full supply pool
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
            Best when you want a flexible demo path or have not committed to one squad yet. Nomos can assemble specialists from the entire marketplace.
          </div>
          <div style={{ fontSize: "0.6875rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>
            {agents.length} agents available right now
          </div>
          {mode === "team" && (
            <Link
              href="/orchestrate"
              style={{ fontSize: "0.6875rem", color: "var(--ink)", textDecoration: "none", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em" }}
            >
              Switch to marketplace mode →
            </Link>
          )}
        </div>

        <div
          className="card"
          style={{
            padding: "20px",
            background: mode === "team" ? "var(--blue-soft)" : "var(--bg-elev)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.24em", color: "var(--ink)", fontWeight: 600 }}>
            02 / team mode
          </div>
          <div
            className="font-display"
            style={{ fontSize: "1.25rem", color: "var(--ink)", lineHeight: 1, letterSpacing: "0.005em" }}
          >
            Run one curated squad end to end
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
            Best when you want clear accountability and a sharper product story. Team pages pre-package trust, specialty, and pricing before the run starts.
          </div>
          <div style={{ fontSize: "0.6875rem", fontFamily: "JetBrains Mono, monospace", color: team ? "var(--ink)" : "var(--text-muted)" }}>
            {team ? `${team.name} selected` : "Open any team page to enter team mode"}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <div
              style={{
                fontSize: "0.625rem",
                textTransform: "uppercase",
                letterSpacing: "0.24em",
                color: "var(--ink)",
                fontWeight: 600,
              }}
            >
              § demo presets
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)", marginTop: "4px" }}>
              Use a mixed-complexity goal to make routing and savings obvious on screen.
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setGoal(preset.value)}
                className="pill-neo"
                style={{
                  cursor: "pointer",
                  fontSize: "0.625rem",
                  padding: "4px 12px",
                  letterSpacing: "0.14em",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
          Strongest live path: run a selected team and use the launch preset so Nomos shows Haiku, Sonnet, and Opus in one pass.
        </div>
      </div>

      <ExecutionStepper subtasks={subtasks} running={running} finished={finished} />

      {team && (
        <div
          className="card"
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            background: "var(--blue-soft)",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              border: "2px solid var(--ink)",
              background: "var(--cream)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {team.cover_emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--ink)", marginBottom: "4px", fontWeight: 600 }}>
              team selected
            </div>
            <div
              className="font-display"
              style={{ fontSize: "1rem", color: "var(--ink)", lineHeight: 1, letterSpacing: "0.005em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {team.name}
            </div>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "4px", fontFamily: "JetBrains Mono, monospace" }}>
              {agents.length} agents · avg {team.avg_savings_pct.toFixed(1)}% savings
            </div>
          </div>
          <Link
            href={`/teams/${team.id}`}
            style={{
              fontSize: "0.6875rem",
              color: "var(--ink)",
              textDecoration: "none",
              flexShrink: 0,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
            }}
          >
            view team →
          </Link>
        </div>
      )}

      <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.24em", color: "var(--ink)", fontWeight: 600 }}>
              § {mode === "team" ? "team run" : "marketplace run"}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)", marginTop: "4px" }}>
              {mode === "team"
                ? "This run stays inside the selected squad."
                : "This run can draw from the full marketplace supply."}
            </div>
          </div>
          {mode === "marketplace" && (
            <Link
              href="/"
              style={{
                fontSize: "0.6875rem",
                color: "var(--ink)",
                textDecoration: "none",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
              }}
            >
              Browse teams first →
            </Link>
          )}
        </div>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={4}
          className="textarea-neo"
          placeholder="Describe your goal…"
        />
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <button
            onClick={run}
            disabled={running || !goal.trim()}
            className="btn-primary"
            style={{ opacity: (running || !goal.trim()) ? 0.45 : 1 }}
          >
            {running ? "Routing…" : team ? `Run ${team.name}` : "Run orchestrator"}
          </button>
          {error && (
            <div
              style={{
                fontSize: "0.8125rem",
                color: "var(--ink)",
                background: "var(--pink-soft)",
                border: "1.5px solid var(--ink)",
                borderRadius: "10px",
                padding: "6px 12px",
              }}
            >
              {error}
            </div>
          )}
        </div>
        {!team && (
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Marketplace mode can hire from the full pool, but the sharpest renter narrative usually starts from a specific team page.
          </div>
        )}
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

export default function OrchestratePage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--text-dim)]">Loading...</div>}>
      <OrchestrateInner />
    </Suspense>
  );
}
