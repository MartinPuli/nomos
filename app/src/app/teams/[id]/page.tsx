import { notFound } from "next/navigation";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { ensureSeeded } from "@/lib/seed";
import { getTeam, teamAverageSuccessRate, teamGithubBackedCount, teamMembers, teamTierMix } from "@/lib/teams";
import { ethToUsdc } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function TeamDetail({ params }: { params: Promise<{ id: string }> }) {
  ensureSeeded();
  const { id }        = await params;
  const team          = getTeam(id);
  if (!team) notFound();
  const members       = teamMembers(team);
  const tierMix       = teamTierMix(team);
  const avgSuccess    = teamAverageSuccessRate(team);
  const githubBacked  = teamGithubBackedCount(team);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>

      {/* Back */}
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}>
        ← Marketplace
      </Link>

      {/* Hero header */}
      <header
        className="card"
        style={{ padding: "0", overflow: "hidden" }}
      >
        {/* Gradient banner */}
        <div style={{ height: "6px", background: "linear-gradient(to right, var(--accent), var(--tier-opus))" }} />
        <div style={{ padding: "28px", display: "flex", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
          <div
            style={{
              width: "64px", height: "64px", borderRadius: "16px", flexShrink: 0,
              background: "var(--accent-soft)", border: "1px solid rgba(107,92,231,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem", lineHeight: 1,
            }}
          >
            {team.cover_emoji}
          </div>
          <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex", alignSelf: "flex-start",
                fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
                color: "var(--accent)", background: "var(--accent-soft)",
                border: "1px solid rgba(107,92,231,0.2)",
                padding: "3px 10px", borderRadius: "999px",
              }}
            >
              {team.specialty}
            </span>
            <h1
              className="font-display"
              style={{ fontSize: "2.5rem", color: "var(--text)", margin: 0, lineHeight: 1.05, letterSpacing: "0.01em" }}
            >
              {team.name}
            </h1>
            <p style={{ fontSize: "1rem", color: "var(--text-dim)", margin: 0, lineHeight: 1.5 }}>
              {team.tagline}
            </p>
          </div>
          <Link href={`/orchestrate?team=${team.id}`} className="btn-primary" style={{ flexShrink: 0 }}>
            Run this team →
          </Link>
        </div>
      </header>

      {/* Description */}
      <p style={{ color: "var(--text-dim)", maxWidth: "640px", lineHeight: 1.7, fontSize: "0.9375rem", margin: 0 }}>
        {team.description}
      </p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg savings",  value: `${team.avg_savings_pct.toFixed(1)}%`,               color: "var(--savings)" },
          { label: "Rent / task",  value: `${ethToUsdc(team.rent_price_eth_per_task)} USDC`,    color: "var(--text)" },
          { label: "Avg tokens",   value: team.avg_tokens_per_task.toLocaleString(),           color: "var(--text)" },
          { label: "Tasks done",   value: team.tasks_completed.toLocaleString(),               color: "var(--text)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "8px" }}>
              {label}
            </div>
            <div className="font-display" style={{ fontSize: "1.75rem", color, lineHeight: 1 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Model mix */}
        <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>Model mix</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { label: "Simple",   count: tierMix.simple,   color: "var(--tier-haiku)"  },
              { label: "Moderate", count: tierMix.moderate, color: "var(--tier-sonnet)" },
              { label: "Complex",  count: tierMix.complex,  color: "var(--tier-opus)"   },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: "8px", background: "var(--bg-elev2)" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: "1.25rem", color }}>{count}</div>
                <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Covers cheap formatting, balanced writing, and deep reasoning.
          </div>
        </div>

        {/* Reliability */}
        <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>Member reliability</div>
          <div className="font-display" style={{ fontSize: "2.5rem", color: "var(--savings)", lineHeight: 1 }}>
            {(avgSuccess * 100).toFixed(0)}%
          </div>
          <div style={{ height: "4px", background: "var(--bg-elev3)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--savings)", borderRadius: "3px", width: `${avgSuccess * 100}%` }} />
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Average success rate across specialists.</div>
        </div>

        {/* GitHub-backed */}
        <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>GitHub-backed</div>
          <div className="font-display" style={{ fontSize: "2.5rem", color: "var(--tier-sonnet)", lineHeight: 1 }}>
            {githubBacked}/{members.length}
          </div>
          <div style={{ height: "4px", background: "var(--bg-elev3)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--tier-sonnet)", borderRadius: "3px", width: `${members.length > 0 ? (githubBacked / members.length) * 100 : 0}%` }} />
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Live-registered agents vs seeded fixtures.</div>
        </div>
      </div>

      {/* Skills */}
      <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h2 style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", margin: 0 }}>
          Shared skills
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {team.skills_union.map((s) => (
            <span
              key={s}
              style={{
                fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace",
                background: "var(--bg-elev2)", border: "1px solid var(--border)",
                borderRadius: "6px", padding: "4px 10px", color: "var(--text-dim)",
              }}
            >
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </section>

      {/* Members */}
      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h2
          className="font-display"
          style={{ fontSize: "1.5rem", color: "var(--text)", margin: 0, lineHeight: 1.1 }}
        >
          Members{" "}
          <span style={{ color: "var(--text-muted)", fontFamily: "Inter, sans-serif", fontWeight: 400, fontSize: "1rem" }}>
            ({members.length})
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((a) => <AgentCard key={a.id} agent={a} />)}
        </div>
      </section>

      {/* CTA */}
      <div
        className="card"
        style={{
          padding: "28px", overflow: "hidden", position: "relative",
          background: "linear-gradient(135deg, var(--accent-soft) 0%, var(--bg-elev) 60%)",
          borderColor: "rgba(107,92,231,0.2)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px",
        }}
      >
        <div>
          <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent)", marginBottom: "6px" }}>
            Ready to ship?
          </div>
          <div className="font-display" style={{ fontSize: "1.75rem", color: "var(--text)", lineHeight: 1.05, marginBottom: "6px" }}>
            Hand this team your goal
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>
            Decomposes · classifies · routes · delivers.
          </div>
        </div>
        <Link href={`/orchestrate?team=${team.id}`} className="btn-primary">
          Run this team →
        </Link>
      </div>

    </div>
  );
}
