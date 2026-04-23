import { notFound } from "next/navigation";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { ensureSeeded } from "@/lib/seed";
import { listTeams, getTeam, teamMembers } from "@/lib/teams";

export const dynamic = "force-dynamic";

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

export default async function SquadDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  ensureSeeded();
  const { slug } = await params;
  const team = listTeams().find((t) => t.slug === slug) ?? getTeam(slug);
  if (!team) notFound();
  const members = teamMembers(team);
  const lead = members.find((m) => m.id === team.lead_agent_id);

  return (
    <div className="flex flex-col gap-10">
      <Link href="/" className="text-sm text-[var(--text-dim)] hover:text-white">
        ← back to marketplace
      </Link>

      <header className="flex items-start gap-6">
        <div className="text-6xl leading-none">{team.cover_emoji}</div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--accent)] bg-[var(--accent)]/10 rounded px-2 py-0.5">
              {VERTICAL_LABEL[team.vertical] ?? team.vertical}
            </span>
            <span className="text-[10px] text-[var(--text-dim)]">
              {team.languages.join(" · ").toUpperCase()}
            </span>
            {team.jurisdictions && (
              <span className="text-[10px] text-[var(--text-dim)]">
                · {team.jurisdictions.join("/")}
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl">{team.name}</h1>
          <p className="text-lg text-[var(--text-dim)]">{team.tagline}</p>
        </div>
        <Link
          href={`/squads/${team.slug}/quote`}
          className="bg-[var(--accent)] hover:opacity-90 px-6 py-3 rounded text-sm font-semibold whitespace-nowrap"
        >
          Request a quote →
        </Link>
      </header>

      <p className="text-[var(--text-dim)] max-w-3xl">{team.description}</p>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Avg rating</div>
          <div className="font-mono text-3xl font-bold">
            ★ {team.avg_rating.toFixed(1)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Retention</div>
          <div className="font-mono text-3xl font-bold">
            {(team.retention_rate * 100).toFixed(0)}%
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Active subs</div>
          <div className="font-mono text-3xl font-bold">
            {team.active_subscriptions}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Avg turnaround</div>
          <div className="font-mono text-3xl font-bold">
            {team.avg_turnaround_hours}h
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Subscription tiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {team.tiers.map((tier, i) => (
            <div
              key={tier.id}
              className={`card p-5 flex flex-col gap-3 ${
                i === 1 ? "border-[var(--accent)]" : ""
              }`}
            >
              {i === 1 && (
                <div className="text-[10px] uppercase tracking-wider text-[var(--accent)]">
                  Most popular
                </div>
              )}
              <div className="font-semibold text-lg">{tier.name}</div>
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-3xl font-bold">
                  ${tier.monthly_price_usd}
                </span>
                <span className="text-sm text-[var(--text-dim)]">/month</span>
              </div>
              <div className="text-xs text-[var(--text-dim)]">
                {tier.included_tasks_per_month === "unlimited"
                  ? "Unlimited tasks"
                  : `${tier.included_tasks_per_month} tasks / month`}
                {" · "}
                {tier.sla_hours}h SLA
              </div>
              <ul className="flex flex-col gap-1.5 text-xs mt-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[var(--accent)]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/squads/${team.slug}/quote?tier=${tier.id}`}
                className="mt-auto pt-2 text-center bg-[var(--bg-elev2)] hover:bg-[var(--accent)] hover:text-white transition rounded py-2 text-xs font-semibold"
              >
                Choose {tier.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
          Shared skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {team.skills_union.map((s) => (
            <span
              key={s}
              className="text-xs bg-[var(--bg-elev2)] border border-[var(--border)] rounded px-2 py-1"
            >
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">
          Team ({members.length}) · Lead: {lead?.name ?? "unassigned"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      </section>

      {team.disclaimer && (
        <section className="card p-4 bg-yellow-500/5 border-yellow-500/30 text-xs text-[var(--text-dim)]">
          <strong className="text-yellow-400">Disclaimer:</strong> {team.disclaimer}
        </section>
      )}

      <section className="card p-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-[var(--text-dim)]">Ready to subscribe?</div>
          <div className="text-lg font-semibold mt-1">Tell us what you need</div>
          <div className="text-sm text-[var(--text-dim)]">
            We&apos;ll match you to a tier and start within hours.
          </div>
        </div>
        <Link
          href={`/squads/${team.slug}/quote`}
          className="bg-[var(--accent)] hover:opacity-90 px-6 py-3 rounded text-sm font-semibold whitespace-nowrap"
        >
          Request a quote →
        </Link>
      </section>
    </div>
  );
}
