"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Tab = "quotes" | "subscriptions" | "tasks";

interface PendingQuote {
  id: string;
  squad_slug: string;
  squad_name: string;
  squad_emoji: string;
  tier_id: string;
  tier_name: string;
  monthly_price_usd: number;
  description: string;
  volume: string;
  attachments_note: string;
  created_at: string;
  status: "pending_squad_review";
}

function InboxInner() {
  const searchParams = useSearchParams();
  const justSent = searchParams.get("quote") === "sent";
  const [tab, setTab] = useState<Tab>("quotes");
  const [pending, setPending] = useState<PendingQuote[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("nomos_pending_quotes");
    if (raw) {
      try {
        setPending(JSON.parse(raw) as PendingQuote[]);
      } catch {
        // ignore
      }
    }
  }, []);

  function clearPending(id: string) {
    const next = pending.filter((p) => p.id !== id);
    setPending(next);
    localStorage.setItem("nomos_pending_quotes", JSON.stringify(next));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wider text-[var(--accent)]">
          Your inbox
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Quotes, subscriptions & tasks</h1>
      </header>

      {justSent && (
        <div className="card p-4 bg-green-500/5 border-green-500/40">
          <div className="text-sm font-semibold text-green-400">Quote request sent ✓</div>
          <div className="text-xs text-[var(--text-dim)] mt-1">
            The squad will review and respond within 24h. You&apos;ll see their proposed tier here.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {([
          { id: "quotes", label: `Pending quotes${pending.length > 0 ? ` (${pending.length})` : ""}` },
          { id: "subscriptions", label: "Active subscriptions" },
          { id: "tasks", label: "Tasks" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm border-b-2 transition -mb-px ${
              tab === t.id
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-[var(--text-dim)] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "quotes" && (
        <section className="flex flex-col gap-3">
          {pending.length === 0 && (
            <EmptyState
              title="No pending quotes"
              body="Browse squads and request your first quote."
              ctaHref="/"
              ctaLabel="Browse squads →"
            />
          )}
          {pending.map((q) => (
            <div key={q.id} className="card p-5 flex gap-4">
              <div className="text-3xl">{q.squad_emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/squads/${q.squad_slug}`}
                    className="font-semibold hover:text-[var(--accent)]"
                  >
                    {q.squad_name}
                  </Link>
                  <span className="text-[10px] uppercase bg-yellow-500/15 text-yellow-400 rounded px-1.5 py-0.5">
                    Pending squad review
                  </span>
                </div>
                <div className="text-xs text-[var(--text-dim)] mt-1">
                  Requested {q.tier_name} · ${q.monthly_price_usd}/mo · {new Date(q.created_at).toLocaleString()}
                </div>
                <p className="text-sm mt-3 line-clamp-2">{q.description}</p>
                <div className="text-xs text-[var(--text-dim)] mt-2">
                  <strong className="text-white">Volume:</strong> {q.volume}
                </div>
                {q.attachments_note && (
                  <div className="text-xs text-[var(--text-dim)] mt-1">
                    <strong className="text-white">Refs:</strong> {q.attachments_note}
                  </div>
                )}
              </div>
              <button
                onClick={() => clearPending(q.id)}
                className="text-xs text-[var(--text-dim)] hover:text-red-400 self-start"
                title="Cancel quote"
              >
                cancel
              </button>
            </div>
          ))}
        </section>
      )}

      {tab === "subscriptions" && (
        <EmptyState
          title="No active subscriptions"
          body="Once a squad accepts your quote, your subscription will appear here with your remaining tasks for the month."
          ctaHref="/"
          ctaLabel="Browse squads →"
        />
      )}

      {tab === "tasks" && (
        <EmptyState
          title="No tasks yet"
          body="When you have an active subscription, this is where you send tasks and receive deliverables."
          ctaHref="/"
          ctaLabel="Browse squads →"
        />
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="card p-10 flex flex-col items-center text-center gap-3">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-sm text-[var(--text-dim)] max-w-md">{body}</div>
      <Link
        href={ctaHref}
        className="mt-3 bg-[var(--accent)] hover:opacity-90 px-5 py-2 rounded text-sm font-semibold"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--text-dim)]">Loading inbox...</div>}>
      <InboxInner />
    </Suspense>
  );
}
