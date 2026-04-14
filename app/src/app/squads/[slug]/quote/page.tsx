"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Team, SubscriptionTier, Agent } from "@/lib/types";

interface SquadDetailResponse {
  team: Team;
  members: Agent[];
}

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

function QuoteInner() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tierFromQuery = searchParams.get("tier");

  const [team, setTeam] = useState<Team | null>(null);
  const [tierId, setTierId] = useState<string>(tierFromQuery ?? "");
  const [description, setDescription] = useState("");
  const [volume, setVolume] = useState("");
  const [attachmentsNote, setAttachmentsNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.slug) return;
    fetch(`/api/teams/${params.slug}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const data = j.data as SquadDetailResponse;
          setTeam(data.team);
          if (!tierId && data.team.tiers[0]) setTierId(data.team.tiers[0].id);
        } else {
          setError(j.error?.message ?? "squad not found");
        }
      })
      .catch(() => setError("failed to load squad"));
  }, [params?.slug, tierId]);

  const selectedTier: SubscriptionTier | undefined = team?.tiers.find((t) => t.id === tierId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !selectedTier) return;
    setSubmitting(true);
    setError(null);

    const pending: PendingQuote = {
      id: crypto.randomUUID(),
      squad_slug: team.slug,
      squad_name: team.name,
      squad_emoji: team.cover_emoji,
      tier_id: selectedTier.id,
      tier_name: selectedTier.name,
      monthly_price_usd: selectedTier.monthly_price_usd,
      description,
      volume,
      attachments_note: attachmentsNote,
      created_at: new Date().toISOString(),
      status: "pending_squad_review",
    };

    const existing = JSON.parse(localStorage.getItem("nomos_pending_quotes") ?? "[]") as PendingQuote[];
    localStorage.setItem("nomos_pending_quotes", JSON.stringify([pending, ...existing]));

    await new Promise((r) => setTimeout(r, 400));
    router.push("/inbox?quote=sent");
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-red-400 text-sm">{error}</div>
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline mt-3 inline-block">
          ← back to marketplace
        </Link>
      </div>
    );
  }

  if (!team) {
    return <div className="text-sm text-[var(--text-dim)]">Loading squad...</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Link href={`/squads/${team.slug}`} className="text-sm text-[var(--text-dim)] hover:text-white">
        ← back to {team.name}
      </Link>

      <header className="flex items-start gap-4">
        <div className="text-4xl">{team.cover_emoji}</div>
        <div>
          <div className="text-xs uppercase tracking-wider text-[var(--accent)]">
            Request a quote
          </div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-sm text-[var(--text-dim)]">{team.tagline}</p>
        </div>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="card p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
              Tier you&apos;re interested in
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {team.tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTierId(t.id)}
                  className={`p-3 rounded border text-left transition ${
                    tierId === t.id
                      ? "bg-[var(--accent)]/15 border-[var(--accent)]"
                      : "bg-[var(--bg-elev2)] border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                >
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="font-mono text-lg">${t.monthly_price_usd}/mo</div>
                  <div className="text-[10px] text-[var(--text-dim)] mt-1">
                    {t.included_tasks_per_month === "unlimited"
                      ? "Unlimited"
                      : `${t.included_tasks_per_month} tasks`} · {t.sla_hours}h SLA
                  </div>
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
              Describe what you need
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="e.g. We need help drafting NDAs and reviewing customer contracts for our AR-based SaaS. About 8 documents a month..."
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
              Expected volume
            </span>
            <input
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              required
              placeholder="e.g. 8 contracts/mo + 2 compliance reviews"
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
              Attachments or reference material (optional)
            </span>
            <textarea
              value={attachmentsNote}
              onChange={(e) => setAttachmentsNote(e.target.value)}
              rows={2}
              placeholder="Paste links or describe what you'll share (Notion page, Google Drive, GitHub repo, sample docs...)"
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        {selectedTier && (
          <div className="card p-4 bg-[var(--accent)]/5 border-[var(--accent)]/40 text-xs text-[var(--text-dim)]">
            The squad will review your request and confirm the <strong className="text-white">{selectedTier.name}</strong> tier at <strong className="text-white">${selectedTier.monthly_price_usd}/month</strong> or propose a better fit within 24h. You pay nothing until you accept their quote.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !description.trim() || !volume.trim()}
          className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-3 rounded text-sm font-semibold self-start"
        >
          {submitting ? "Sending..." : "Send quote request →"}
        </button>
      </form>
    </div>
  );
}

export default function QuotePage() {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--text-dim)]">Loading...</div>}>
      <QuoteInner />
    </Suspense>
  );
}
