import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TierBadge } from "@/components/TierBadge";
import { ensureSeeded } from "@/lib/seed";
import { getAgent } from "@/lib/store";
import { MODEL_RATES, taskPriceEth, ethToUsdc } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  ensureSeeded();
  const { id } = await params;
  const agent = getAgent(id);
  if (!agent) return { title: "Agent not found" };
  const title = `${agent.name} (${agent.handle})`;
  const description =
    agent.description?.slice(0, 180) ??
    `${agent.name} — ${agent.default_tier} tier specialist on Nomos.`;
  const canonical = `/agents/${agent.id}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "profile" },
    twitter: { card: "summary", title, description },
  };
}

const TIER_COLOR: Record<string, string> = {
  simple:   "var(--tier-haiku)",
  moderate: "var(--tier-sonnet)",
  complex:  "var(--tier-opus)",
};
const TIER_BG: Record<string, string> = {
  simple:   "var(--tier-haiku-bg)",
  moderate: "var(--tier-sonnet-bg)",
  complex:  "var(--tier-opus-bg)",
};

export default async function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  ensureSeeded();
  const { id }   = await params;
  const agent    = getAgent(id);
  if (!agent) notFound();

  const tiers = ["simple", "moderate", "complex"] as const;
  const isGitHub = agent.source === "github";
  const completionRate =
    agent.metrics.tasks_attempted > 0
      ? (agent.metrics.tasks_completed / agent.metrics.tasks_attempted) * 100
      : agent.metrics.success_rate * 100;
  const tierColor = TIER_COLOR[agent.default_tier] ?? "var(--accent)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>

      {/* Back */}
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "none" }}>
        ← Marketplace
      </Link>

      {/* Header */}
      <header
        className="card"
        style={{ padding: "28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", overflow: "hidden", position: "relative" }}
      >
        {/* Tier color glow */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: tierColor }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className="pill-neo"
              style={{
                background: isGitHub ? "var(--yerba-soft)" : "var(--cream-2)",
              }}
            >
              {isGitHub ? "GitHub-backed" : "Fixture"}
            </span>
            {agent.github_url && (
              <a
                href={agent.github_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "0.75rem",
                  color: "var(--ink)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {agent.github_url.replace("https://github.com/", "")} ↗
              </a>
            )}
          </div>
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
            {agent.name}
          </h1>
          <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
            {agent.handle}
          </div>
        </div>
        <TierBadge tier={agent.default_tier} size="md" />
      </header>

      {/* Description */}
      <p style={{ color: "var(--text-dim)", lineHeight: 1.7, fontSize: "0.9375rem", margin: 0, maxWidth: "600px" }}>
        {agent.description}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Success rate",    value: `${(agent.metrics.success_rate * 100).toFixed(0)}%`,              color: "var(--savings)" },
          { label: "Completion rate", value: `${completionRate.toFixed(0)}%`,                                  color: "var(--text)" },
          { label: "Commits 90d",     value: String(agent.commits_90d),                                        color: "var(--tier-sonnet)" },
          { label: "Quality",         value: agent.quality.toFixed(2),                                         color: tierColor },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "6px" }}>
              {label}
            </div>
            <div className="font-display" style={{ fontSize: "1.75rem", color, lineHeight: 1 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Skills */}
      <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h2 style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", margin: 0 }}>
          Skills
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {agent.skills.map((s) => (
            <span
              key={s}
              style={{
                fontSize: "0.75rem", background: "var(--bg-elev2)",
                border: "1px solid var(--border)", borderRadius: "6px",
                padding: "4px 10px", color: "var(--text-dim)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </section>

      {/* Pricing by tier */}
      <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h2 style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", margin: 0 }}>
          Pricing by tier
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const avg   = agent.metrics.avg_tokens_per_task[tier];
            if (!avg) return null;
            const model = tier === "simple" ? "haiku" : tier === "moderate" ? "sonnet" : "opus";
            const price = taskPriceEth(model, avg, agent.quality);
            const tc    = TIER_COLOR[tier];
            const tbg   = TIER_BG[tier];
            return (
              <div
                key={tier}
                className="card"
                style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px", borderTop: `2.5px solid ${tc}` }}
              >
                <TierBadge tier={tier} />
                <div>
                  <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Avg tokens
                  </div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.125rem", fontWeight: 700, color: "var(--text)" }}>
                    {avg.toLocaleString()}
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Est. / task
                  </div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.9375rem", fontWeight: 700, color: tc }}>
                    {ethToUsdc(price)} USDC
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Source info */}
      <div
        className="card"
        style={{ padding: "16px 20px", display: "flex", gap: "16px", alignItems: "flex-start", background: isGitHub ? "var(--tier-haiku-bg)" : "var(--bg-elev)", borderColor: isGitHub ? "var(--tier-haiku-border)" : "var(--border)" }}
      >
        <span style={{ fontSize: "1.25rem", lineHeight: 1, flexShrink: 0 }}>{isGitHub ? "🔗" : "🧪"}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: isGitHub ? "var(--tier-haiku)" : "var(--text)", marginBottom: "4px" }}>
            {isGitHub ? "GitHub-backed agent" : "Fixture agent"}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)", lineHeight: 1.55 }}>
            {isGitHub
              ? "Imported from a live GitHub repository. Metrics reflect real commit activity and repository signals."
              : "Curated fixture used to seed the marketplace and demo compute routing flows."}
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.6875rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
            {agent.metrics.tasks_completed.toLocaleString()} completed / {agent.metrics.tasks_attempted.toLocaleString()} attempted
          </div>
        </div>
      </div>

      {/* Rate reference */}
      <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "16px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1.8 }}>
        Base rates —{" "}
        <span style={{ color: "var(--tier-haiku)" }}>Haiku {MODEL_RATES.haiku.toFixed(8)} ETH/token</span> ·{" "}
        <span style={{ color: "var(--tier-sonnet)" }}>Sonnet {MODEL_RATES.sonnet.toFixed(8)} ETH/token</span> ·{" "}
        <span style={{ color: "var(--tier-opus)" }}>Opus {MODEL_RATES.opus.toFixed(8)} ETH/token</span>
      </div>
    </div>
  );
}
