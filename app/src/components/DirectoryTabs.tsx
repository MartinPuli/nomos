"use client";

import { useState } from "react";
import type { Team, Agent } from "@/lib/types";
import { TeamCard } from "./TeamCard";
import { AgentCard } from "./AgentCard";

type TabId = "teams" | "agents";

const TABS: { id: TabId; kicker: string; label: string; blurb: string }[] = [
  {
    id: "teams",
    kicker: "01",
    label: "teams",
    blurb: "Curated squads — rent one and it handles the rest.",
  },
  {
    id: "agents",
    kicker: "02",
    label: "agents",
    blurb: "The supply layer — specialists assembled into teams.",
  },
];

export function DirectoryTabs({
  teams,
  agents,
}: {
  teams: Team[];
  agents: Agent[];
}) {
  const [active, setActive] = useState<TabId>("teams");
  const activeTab = TABS.find((t) => t.id === active)!;
  const count = active === "teams" ? teams.length : agents.length;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Section header + tabs */}
      <header style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span className="caps-mark">§ the directory</span>
            <h2
              className="font-display"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                color: "var(--ink)",
                margin: "8px 0 0",
                lineHeight: 1.15,
                letterSpacing: "0.005em",
              }}
            >
              pick your gnomes.
            </h2>
          </div>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-dim)",
              maxWidth: "260px",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Switch between full squads and solo agents. Both route through the
            same cheapest-model engine.
          </p>
        </div>

        <div className="rule-heavy" />

        {/* Tab chips */}
        <nav
          aria-label="Directory view"
          style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}
        >
          {TABS.map((t) => {
            const isActive = t.id === active;
            const tabCount = t.id === "teams" ? teams.length : agents.length;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(t.id)}
                className="tab-chip"
                style={{ minWidth: "160px" }}
              >
                <span
                  className="caps-meta"
                  style={{ color: isActive ? "var(--cream-2)" : "var(--text-dim)" }}
                >
                  {t.kicker}
                  <span style={{ margin: "0 6px", opacity: 0.5 }}>/</span>
                  {tabCount}
                </span>
                <span
                  className="font-display"
                  style={{
                    fontSize: "2rem",
                    lineHeight: 1.15,
                    letterSpacing: "0.005em",
                    color: isActive ? "var(--cream)" : "var(--ink)",
                  }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Active-tab blurb */}
        <p
          className="font-display"
          style={{
            fontSize: "1.125rem",
            color: "var(--text-dim)",
            margin: 0,
            lineHeight: 1.55,
            maxWidth: "640px",
          }}
        >
          {activeTab.blurb}
        </p>
      </header>

      {/* Grid */}
      {active === "teams" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      )}

      {/* Footer strip */}
      <div
        style={{
          borderTop: "2px solid var(--ink)",
          paddingTop: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <span className="caps-meta">
          showing {count} {active === "teams" ? "squads" : "agents"}
        </span>
        <a
          href="/register"
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          list your gnome →
        </a>
      </div>
    </section>
  );
}
