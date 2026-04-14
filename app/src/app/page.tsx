// Marketplace home. Server component that seeds fixtures, fetches teams + agents,
// and stacks: Hero (( nomos ) wordmark + stats + tier legend) → DirectoryTabs
// (teams | agents grid) → TeamNavigator (outcome-first CTAs) → RecentRunsPanel.
// `force-dynamic` keeps the aggregate stats fresh across requests.
import { DirectoryTabs } from "@/components/DirectoryTabs";
import { GnomeHat, GnomePeek } from "@/components/GnomeArt";
import { TeamNavigator } from "@/components/TeamNavigator";
import { RecentRunsPanel } from "@/components/RecentRunsPanel";
import { ensureSeeded } from "@/lib/seed";
import { listTeams } from "@/lib/teams";
import { listAgents, listRuns } from "@/lib/store";

export const dynamic = "force-dynamic";

const PARTNERS = ["kaszek"];

export default function MarketplacePage() {
  ensureSeeded();
  const teams = listTeams();
  const agents = listAgents();
  const runs = listRuns();
  const totalTasks = teams.reduce((sum, t) => sum + (t.tasks_completed ?? 0), 0);
  const avgSavings = teams.length
    ? Math.round(
        teams.reduce((sum, t) => sum + (t.avg_savings_pct ?? 0), 0) /
          teams.length,
      )
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "72px" }}>
      {/* ════════════════════════════════════════════════
          HERO — cozy landing, duotone cream + charcoal
          ════════════════════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--cream)",
          border: "2px solid var(--ink)",
          borderRadius: "28px",
          padding: "72px 24px 56px",
          marginTop: "8px",
          boxShadow: "var(--shadow-neo-lg)",
        }}
      >
        {/* Corner gnome hats */}
        <div
          aria-hidden
          className="hat-sway-left"
          style={{
            position: "absolute",
            top: "-14px",
            left: "-14px",
            width: "clamp(80px, 12vw, 150px)",
            pointerEvents: "none",
          }}
        >
          <GnomeHat size={150} style={{ width: "100%", height: "auto" }} />
        </div>
        <div
          aria-hidden
          className="hat-sway-right"
          style={{
            position: "absolute",
            top: "-14px",
            right: "-14px",
            width: "clamp(80px, 12vw, 150px)",
            pointerEvents: "none",
          }}
        >
          <GnomeHat
            size={150}
            flipped
            style={{ width: "100%", height: "auto" }}
          />
        </div>
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-18px",
            left: "-18px",
            width: "clamp(80px, 12vw, 150px)",
            pointerEvents: "none",
            transform: "rotate(140deg)",
            transformOrigin: "top center",
          }}
        >
          <div className="hat-sway-left">
            <GnomeHat size={150} style={{ width: "100%", height: "auto" }} />
          </div>
        </div>
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-18px",
            right: "-18px",
            width: "clamp(80px, 12vw, 150px)",
            pointerEvents: "none",
            transform: "rotate(-140deg)",
            transformOrigin: "top center",
          }}
        >
          <div className="hat-sway-right">
            <GnomeHat
              size={150}
              flipped
              style={{ width: "100%", height: "auto" }}
            />
          </div>
        </div>

        {/* Hero content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "0",
            maxWidth: "760px",
            margin: "0 auto",
          }}
        >
          {/* Partner row */}
          <div
            className="hero-fade"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "28px",
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: "48px",
              animationDelay: "60ms",
            }}
          >
            {PARTNERS.map((p, i) => (
              <div
                key={p}
                style={{ display: "flex", alignItems: "center", gap: "28px" }}
              >
                {i > 0 && (
                  <span
                    aria-hidden
                    style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}
                  >
                    ✦
                  </span>
                )}
                <span className="caps-mark">{p}</span>
              </div>
            ))}
          </div>

          {/* ( nomos ) wordmark */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: "clamp(6px, 2vw, 18px)",
              lineHeight: 0.8,
            }}
          >
            {/* Peeking gnome — small, floating above the wordmark */}
            <div
              aria-hidden
              className="gnome-peek"
              style={{
                position: "absolute",
                left: "50%",
                top: "-58%",
                width: "clamp(52px, 9vw, 100px)",
                pointerEvents: "none",
                zIndex: 3,
                transform: "translate(-50%, 0)",
              }}
            >
              <GnomePeek size={100} style={{ width: "100%", height: "auto" }} />
            </div>

            <span
              className="parens-left font-display"
              style={{
                fontSize: "clamp(4.5rem, 14vw, 11rem)",
                color: "var(--ink)",
                lineHeight: 0.8,
                userSelect: "none",
              }}
            >
              (
            </span>
            <h1
              className="nomos-drop font-display"
              style={{
                fontSize: "clamp(4rem, 16vw, 12rem)",
                color: "var(--ink)",
                margin: 0,
                lineHeight: 0.8,
                letterSpacing: "0.005em",
                position: "relative",
                zIndex: 2,
              }}
            >
              nomos
            </h1>
            <span
              className="parens-right font-display"
              style={{
                fontSize: "clamp(4.5rem, 14vw, 11rem)",
                color: "var(--ink)",
                lineHeight: 0.8,
                userSelect: "none",
              }}
            >
              )
            </span>
          </div>

          {/* Decorative rule with diamond */}
          <div
            className="hero-fade"
            style={{
              position: "relative",
              width: "clamp(200px, 40%, 320px)",
              marginTop: "32px",
              animationDelay: "950ms",
            }}
          >
            <div className="rule-heavy" />
            <span className="rule-diamond" />
          </div>

          {/* Tagline */}
          <p
            className="hero-fade"
            style={{
              marginTop: "28px",
              fontSize: "clamp(0.75rem, 1.4vw, 0.875rem)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.36em",
              color: "var(--ink)",
              margin: "28px 0 0",
              animationDelay: "1080ms",
            }}
          >
            hire your optimized ai workforce
          </p>

          {/* Subtitle */}
          <p
            className="hero-fade"
            style={{
              marginTop: "24px",
              maxWidth: "560px",
              fontSize: "1rem",
              lineHeight: 1.65,
              color: "var(--text-dim)",
              animationDelay: "1220ms",
            }}
          >
            Give a team a goal and its orchestrator decomposes, classifies, and
            routes each subtask to the cheapest model that can still do it
            well — <span className="kw kw-haiku">haiku</span>,{" "}
            <span className="kw kw-sonnet">sonnet</span> or{" "}
            <span className="kw kw-opus">opus</span>. You only pay for the
            thinking the job actually needed.
          </p>

          {/* CTAs */}
          <div
            className="hero-fade"
            style={{
              marginTop: "36px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "center",
              animationDelay: "1360ms",
            }}
          >
            <a href="/orchestrate" className="btn-neo">
              Run a team →
            </a>
            <a href="/register" className="btn-neo-ghost">
              Register your agent
            </a>
          </div>

          {/* Stats ledger */}
          <div
            className="hero-fade"
            style={{
              marginTop: "64px",
              display: "flex",
              gap: "clamp(24px, 5vw, 56px)",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              animationDelay: "1520ms",
            }}
          >
            <Stat
              value={teams.length.toString()}
              label="squads"
              accent="var(--yerba)"
            />
            <Dot />
            <Stat
              value={agents.length.toString()}
              label="agents"
              accent="var(--blue)"
            />
            <Dot />
            <Stat
              value={`${avgSavings}%`}
              label="avg savings"
              accent="var(--terere)"
            />
            <Dot />
            <Stat
              value={totalTasks.toLocaleString()}
              label="tasks routed"
              accent="var(--pink)"
            />
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════
          DIRECTORY — tabbed squads / agents
          ════════════════════════════════════════════════ */}
      <DirectoryTabs teams={teams} agents={agents} />

      {/* Team navigator — curated vertical grid */}
      <TeamNavigator teams={teams} />

      {/* Recent runs panel */}
      <RecentRunsPanel runs={runs} />
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        position: "relative",
      }}
    >
      <span
        className="font-display"
        style={{
          fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
          color: "var(--ink)",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span className="caps-meta">{label}</span>
      <span
        aria-hidden
        style={{
          width: "18px",
          height: "3px",
          background: accent,
          borderRadius: "2px",
          marginTop: "4px",
          border: "1px solid var(--ink)",
        }}
      />
    </div>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      style={{
        color: "var(--text-muted)",
        fontSize: "1.25rem",
        lineHeight: 1,
        alignSelf: "center",
      }}
    >
      ·
    </span>
  );
}
