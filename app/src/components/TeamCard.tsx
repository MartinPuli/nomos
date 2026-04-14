import Link from "next/link";
import { ethToUsdc } from "@/lib/pricing";
import type { Team } from "@/lib/types";

const VERTICAL_LABEL: Record<string, string> = {
  legal: "Legal",
  content: "Content",
  marketing: "Marketing",
  research: "Research",
  localization: "Localization",
  support: "Support",
  operations: "Operations",
  design: "Design",
  data: "Data",
  accounting: "Accounting",
};

export function TeamCard({ team }: { team: Team }) {
  const savingsColor = team.avg_savings_pct >= 60 ? "var(--savings)" : team.avg_savings_pct >= 40 ? "#D97706" : "var(--text-dim)";

  return (
    <Link
      href={`/teams/${team.id}`}
      className="card card-hover"
      style={{
        display: "flex", flexDirection: "column", gap: "0",
        textDecoration: "none", color: "inherit", overflow: "hidden",
      }}
    >
      {/* Accent bar — colorful stripe */}
      <div
        style={{
          height: "4px",
          background:
            "linear-gradient(to right, var(--yerba) 0%, var(--terere) 33%, var(--pink) 66%, var(--blue) 100%)",
        }}
      />

      <div style={{ padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            style={{
              width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0,
              background: "var(--cream-2)",
              border: "2px solid var(--ink)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", lineHeight: 1,
            }}
          >
            {team.cover_emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="font-display"
              style={{ fontSize: "1.125rem", color: "var(--ink)", lineHeight: 1, letterSpacing: "0.005em" }}
            >
              {team.name}
            </div>
            <div
              style={{
                fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {team.tagline}
            </div>
          </div>
          {/* Specialty pill */}
          <span className="pill-neo pill-neo-accent" style={{ flexShrink: 0 }}>
            {team.specialty}
          </span>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: "0.8125rem", color: "var(--text-dim)", lineHeight: 1.6,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0,
          }}
        >
          {team.description}
        </p>

        {/* Metrics */}
        <div
          style={{
            borderTop: "2px solid var(--ink)", paddingTop: "14px",
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              className="num"
              style={{ fontSize: "1.375rem", color: savingsColor, lineHeight: 1 }}
            >
              {team.avg_savings_pct.toFixed(0)}%
            </div>
            <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              saved
            </div>
          </div>
          <div style={{ textAlign: "center", borderLeft: "1.5px dashed var(--ink)", borderRight: "1.5px dashed var(--ink)" }}>
            <div
              className="num"
              style={{ fontSize: "0.9375rem", color: "var(--ink)", lineHeight: 1 }}
            >
              {ethToUsdc(team.rent_price_eth_per_task)}
            </div>
            <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              USDC / task
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              className="num"
              style={{ fontSize: "0.9375rem", color: "var(--ink)", lineHeight: 1 }}
            >
              {team.quality.toFixed(2)}
            </div>
            <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              quality
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: "0.625rem",
              color: "var(--text-muted)",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            {team.member_ids.length} agents · {team.tasks_completed.toLocaleString("en-US")} tasks
          </span>
          <span
            style={{
              fontSize: "0.6875rem",
              color: "var(--ink)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
            }}
          >
            Run →
          </span>
        </div>
      </div>
    </Link>
  );
}
