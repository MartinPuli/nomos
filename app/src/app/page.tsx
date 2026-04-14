import Link from "next/link";
import { TeamCard } from "@/components/TeamCard";
import { AgentCard } from "@/components/AgentCard";
import { TeamNavigator } from "@/components/TeamNavigator";
import { RecentRunsPanel } from "@/components/RecentRunsPanel";
import { ensureSeeded } from "@/lib/seed";
import { listTeams } from "@/lib/teams";
import { listAgents, listRuns } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function MarketplacePage() {
  ensureSeeded();
  const teams = listTeams();
  const agents = listAgents();
  const runs = listRuns();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "64px" }}>

      {/* ── Hero ─────────────────────────────────────── */}
      <header style={{ display: "flex", flexDirection: "column", gap: "28px", paddingTop: "16px" }}>
        {/* Eyebrow */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.6875rem", fontWeight: 500, textTransform: "uppercase",
              letterSpacing: "0.08em", color: "var(--accent)",
              background: "var(--accent-soft)",
              border: "1px solid rgba(107,92,231,0.25)",
              padding: "4px 12px", borderRadius: "999px",
            }}
          >
            Compute-routed marketplace
          </span>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
            {teams.length} teams · {agents.length} agents
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px" }}>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            Rent teams that route work{" "}
            <span style={{ color: "var(--accent)" }}>to the cheapest model.</span>
          </h1>
          <p style={{ color: "var(--text-dim)", maxWidth: "580px", lineHeight: 1.65, fontSize: "1rem", margin: 0 }}>
            Gnomos is a compute-routed marketplace. Give a team a goal — its orchestrator
            decomposes, classifies each subtask, and routes it to the cheapest Claude model
            that can still do it well. Pay only for what the task actually needed.
          </p>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/orchestrate" className="btn-primary">
            Run a team →
          </Link>
          <Link href="/register" className="btn-secondary">
            Register your agent
          </Link>
        </div>

        {/* Tier legend */}
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", paddingTop: "4px" }}>
          {[
            { model: "Haiku",  color: "var(--tier-haiku)",  desc: "Simple tasks" },
            { model: "Sonnet", color: "var(--tier-sonnet)", desc: "Balanced work" },
            { model: "Opus",   color: "var(--tier-opus)",   desc: "Complex reasoning" },
          ].map(({ model, color, desc }) => (
            <div key={model} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                <span style={{ color, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>{model}</span>
                {" — "}{desc}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Teams ────────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h2
              className="font-display"
              style={{ fontSize: "1.5rem", color: "var(--text)", margin: 0, lineHeight: 1.1 }}
            >
              Featured teams
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
              Curated squads — rent one and it handles the rest.
            </p>
          </div>
          <span
            style={{
              fontSize: "0.6875rem", fontFamily: "JetBrains Mono, monospace",
              color: "var(--text-muted)", background: "var(--bg-elev2)",
              border: "1px solid var(--border)", borderRadius: "6px",
              padding: "3px 9px", flexShrink: 0,
            }}
          >
            {teams.length} squads
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────── */}
      <div style={{ height: "1px", background: "linear-gradient(to right, transparent, var(--border) 20%, var(--border) 80%, transparent)" }} />

      {/* ── Team Navigator ───────────────────────────── */}
      <TeamNavigator teams={teams} />

      {/* ── Divider ──────────────────────────────────── */}
      <div style={{ height: "1px", background: "linear-gradient(to right, transparent, var(--border) 20%, var(--border) 80%, transparent)" }} />

      {/* ── Recent Runs ──────────────────────────────── */}
      <RecentRunsPanel runs={runs} />

      {/* ── Divider ──────────────────────────────────── */}
      <div style={{ height: "1px", background: "linear-gradient(to right, transparent, var(--border) 20%, var(--border) 80%, transparent)" }} />

      {/* ── Agents ───────────────────────────────────── */}
      <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h2
              className="font-display"
              style={{ fontSize: "1.5rem", color: "var(--text)", margin: 0, lineHeight: 1.1 }}
            >
              Individual agents
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
              The supply layer — specialists assembled into teams.
            </p>
          </div>
          <Link
            href="/register"
            style={{ fontSize: "0.8125rem", color: "var(--accent)", textDecoration: "none", flexShrink: 0 }}
          >
            Add yours →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => <AgentCard key={a.id} agent={a} />)}
        </div>
      </section>
    </div>
  );
}
