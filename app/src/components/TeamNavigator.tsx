import Link from "next/link";
import type { Team } from "@/lib/types";

type NavigatorRecommendation = {
  title: string;
  description: string;
  prompt: string;
  teamId: string;
};

const RECOMMENDATIONS: NavigatorRecommendation[] = [
  {
    title: "Ship a launch packet",
    description: "Landing hero, FAQ, SEO brief, and social copy in one coordinated run.",
    prompt:
      "Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes: 'How much? Monthly. Cancel anytime. Who owns data? Customer does. Refunds? 30-day. Enterprise? Yes.'",
    teamId: "content-engine",
  },
  {
    title: "Stress-test product strategy",
    description: "Architecture, packaging, and founder narrative for a technical product decision.",
    prompt:
      "Evaluate a B2B analytics platform: analyze the ingestion architecture, propose a pricing and packaging model, and rewrite the customer-facing summary for the launch memo.",
    teamId: "market-research",
  },
  {
    title: "Scale content operations",
    description: "Translations, summaries, and structured FAQ output on the cheapest viable path.",
    prompt:
      "Turn these product notes into a multilingual FAQ, summarize the support issues into 5 bullet insights, and draft a short launch thread for social channels.",
    teamId: "localization-studio",
  },
];

function buildOrchestrateHref(teamId: string, prompt: string): string {
  const params = new URLSearchParams({ team: teamId, goal: prompt });
  return `/orchestrate?${params.toString()}`;
}

export function TeamNavigator({ teams }: { teams: Team[] }) {
  const cards = RECOMMENDATIONS.map((recommendation) => ({
    recommendation,
    team: teams.find((team) => team.id === recommendation.teamId),
  })).filter((entry): entry is { recommendation: NavigatorRecommendation; team: Team } => !!entry.team);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
            Team navigator
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", maxWidth: "680px", lineHeight: 1.55, margin: "6px 0 0" }}>
            Start from the outcome you want and jump straight into a compatible team with a prefilled goal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {cards.map(({ recommendation, team }) => (
          <div key={recommendation.title} className="card card-hover" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)" }}>
                  Recommended route
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 650, color: "var(--text)", margin: "8px 0 0" }}>
                  {recommendation.title}
                </h3>
              </div>
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{team.cover_emoji}</span>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
              {recommendation.description}
            </p>

            <div className="card" style={{ padding: "12px 14px", background: "var(--bg-elev2)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>{team.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{team.tagline}</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                {team.member_ids.length} agents · {team.avg_savings_pct.toFixed(1)}% avg savings · {team.rent_price_eth_per_task.toFixed(4)} ETH/task
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "auto" }}>
              <Link
                href={buildOrchestrateHref(team.id, recommendation.prompt)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "9px 14px",
                  borderRadius: "9px",
                  background: "var(--accent)",
                  color: "white",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Run this route →
              </Link>
              <Link
                href={`/teams/${team.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "9px 14px",
                  borderRadius: "9px",
                  border: "1px solid var(--border)",
                  color: "var(--text-dim)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Inspect team
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}