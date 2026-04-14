"use client";

import { useState, useMemo } from "react";
import { MOCK_AGENTS } from "@/lib/mock-data";
import { AgentCard } from "@/components/AgentCard";
import { ModelTierBadge } from "@/components/ModelTierBadge";
import { ModelTier } from "@/lib/types";
import { TIER_DESC, cn } from "@/lib/utils";
import { Search, ArrowRight, Zap, TrendingDown, Users2, Info } from "lucide-react";
import Link from "next/link";

type TierFilter = ModelTier | "all";

const STATS = [
  { n: "2,841",  label: "agents",         icon: Users2,     color: "text-gnomo"       },
  { n: "1.2M",   label: "tasks routed",   icon: Zap,        color: "text-sonnet-text" },
  { n: "68%",    label: "avg savings",    icon: TrendingDown, color: "text-haiku-text" },
];

const TIER_FILTERS: { label: string; value: TierFilter }[] = [
  { label: "All",    value: "all"    },
  { label: "Haiku",  value: "haiku"  },
  { label: "Sonnet", value: "sonnet" },
  { label: "Opus",   value: "opus"   },
];

export default function MarketplacePage() {
  const [q, setQ]       = useState("");
  const [tier, setTier] = useState<TierFilter>("all");

  const agents = useMemo(() =>
    MOCK_AGENTS.filter((a) => {
      const matchTier = tier === "all" || a.primary_tier === tier;
      const s = q.toLowerCase();
      const matchQ = !s || a.name.includes(s) || a.description.toLowerCase().includes(s) || a.skills.some((sk) => sk.includes(s));
      return matchTier && matchQ;
    }),
  [q, tier]);

  return (
    <div className="page-container space-y-8">

      <div className="rounded-xl border border-line bg-page px-4 py-3 text-xs text-ink-2">
        This is an exploratory mock frontend. The canonical Nomos product, API routes, and live orchestration flow live in <span className="font-mono">app/</span>.
      </div>

      {/* ── Hero ─────────────────────────────────── */}
      <div className="pt-6 pb-2 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Nomos mock: agent discovery concepts
          </h1>
          <p className="mt-2 text-sm text-ink-2 max-w-xl leading-relaxed">
            This surface is kept only for design exploration. The production direction is team-first and lives under <span className="text-gnomo font-medium">app/</span>, where orchestration, routing receipts, and provider onboarding are implemented.
          </p>
        </div>

        {/* CTA row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/orchestrate" className="btn-primary">
            <Zap className="w-3.5 h-3.5" />
            Explore mock orchestrator
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/register" className="btn-secondary">
            Explore provider mock
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 flex-wrap pt-1">
          {STATS.map(({ n, label, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className={cn("w-3.5 h-3.5", color)} />
              <span className="text-sm font-semibold text-ink">{n}</span>
              <span className="text-sm text-ink-3">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* ── Tier legend ──────────────────────────── */}
      <div className="callout bg-page border-line text-ink-2 text-xs gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-ink-3 flex-shrink-0">
          <Info className="w-3.5 h-3.5" />
          <span>Model tiers</span>
        </div>
        {(["haiku", "sonnet", "opus"] as ModelTier[]).map((t) => (
          <div key={t} className="flex items-center gap-2">
            <ModelTierBadge tier={t} size="sm" />
            <span className="text-ink-3">{TIER_DESC[t]}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────── */}
      <div className="flex gap-3 flex-col sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search agents, skills…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="field pl-9"
          />
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-1 bg-page border border-line rounded-lg px-1.5 py-1.5">
          {TIER_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTier(value)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors duration-100",
                tier === value
                  ? "bg-subtle text-ink border border-line shadow-sm"
                  : "text-ink-2 hover:text-ink hover:bg-subtle/70",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent grid ───────────────────────────── */}
      {agents.length === 0 ? (
        <div className="text-center py-16 text-ink-3">
          <p className="text-sm">No agents match your filter.</p>
          <button onClick={() => { setQ(""); setTier("all"); }} className="text-gnomo text-xs mt-1 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <div key={agent.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <AgentCard agent={agent} />
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom CTA ───────────────────────────── */}
      <div className="text-center pt-4 pb-2">
        <p className="text-sm text-ink-3">
          Canonical product lives in <span className="font-mono">app/</span>. Use this frontend only for visual exploration.
        </p>
      </div>

    </div>
  );
}
