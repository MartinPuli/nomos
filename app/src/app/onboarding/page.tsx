"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Step = 1 | 2 | 3 | 4 | 5;

interface BuyerContext {
  company_name: string;
  industry: string;
  size: "solo" | "small" | "medium" | "large" | "";
  country: string;
  languages: string[];
  tone: string;
  what_you_do: string;
  constraints: string;
  expected_volume: string;
  turnaround_need: "urgent" | "fast" | "standard" | "relaxed" | "";
  priorities: string[];
}

const EMPTY: BuyerContext = {
  company_name: "",
  industry: "",
  size: "",
  country: "",
  languages: [],
  tone: "",
  what_you_do: "",
  constraints: "",
  expected_volume: "",
  turnaround_need: "",
  priorities: [],
};

const INDUSTRIES = [
  "E-commerce", "SaaS", "Consulting", "Agency", "Professional services",
  "Media / Publishing", "Healthcare", "Finance", "Education", "Legal",
  "Real estate", "Manufacturing", "Non-profit", "Government", "Other",
];

const COUNTRIES = [
  "AR", "MX", "ES", "US", "BR", "CL", "CO", "PE", "UY", "PY", "Other",
];

const LANGUAGES = ["es", "en", "pt", "fr", "de", "it"];

const PRIORITIES = [
  "Speed of delivery",
  "Cost efficiency",
  "Human review",
  "Compliance / legal rigor",
  "Brand consistency",
  "Multilingual coverage",
  "Data privacy",
];

function toMarkdown(c: BuyerContext): string {
  return `---
name: ${c.company_name || "[company]"}
industry: ${c.industry || "[industry]"}
size: ${c.size || "[size]"}
country: ${c.country || "[country]"}
languages: [${c.languages.join(", ")}]
turnaround: ${c.turnaround_need || "[tbd]"}
---

## What we do
${c.what_you_do || "[describe your business]"}

## Tone and voice
${c.tone || "[describe your tone]"}

## Expected volume
${c.expected_volume || "[tbd]"}

## Constraints
${c.constraints || "None listed."}

## Priorities (in order)
${c.priorities.length > 0 ? c.priorities.map((p, i) => `${i + 1}. ${p}`).join("\n") : "None listed."}
`;
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [ctx, setCtx] = useState<BuyerContext>(EMPTY);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("nomos_buyer_context") : null;
    if (saved) {
      try {
        setCtx(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nomos_buyer_context", JSON.stringify(ctx));
    }
  }, [ctx]);

  const update = <K extends keyof BuyerContext>(key: K, value: BuyerContext[K]) => {
    setCtx((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArray = (key: "languages" | "priorities", value: string) => {
    setCtx((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const canAdvance = (): boolean => {
    if (step === 1) return !!ctx.company_name && !!ctx.industry && !!ctx.size;
    if (step === 2) return !!ctx.country && ctx.languages.length > 0;
    if (step === 3) return !!ctx.what_you_do && !!ctx.tone;
    if (step === 4) return !!ctx.expected_volume && !!ctx.turnaround_need && ctx.priorities.length > 0;
    return true;
  };

  const markdown = toMarkdown(ctx);

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <header className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wider text-[var(--accent)]">
          Buyer onboarding · Step {step} of 5
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Tell squads about you</h1>
        <p className="text-[var(--text-dim)] max-w-2xl">
          We generate a <code>context.md</code> that squads read to send you accurate quotes.
          You can edit it anytime from your inbox. Nothing is shared until you request your first quote.
        </p>
      </header>

      {/* Progress bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded ${n <= step ? "bg-[var(--accent)]" : "bg-[var(--bg-elev2)]"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="card p-6 flex flex-col gap-5">
          <h2 className="text-xl font-semibold">About your company</h2>
          <Field label="Company name">
            <input
              value={ctx.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              placeholder="Acme Co."
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="Industry">
            <select
              value={ctx.industry}
              onChange={(e) => update("industry", e.target.value)}
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Select industry...</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="Company size">
            <div className="grid grid-cols-4 gap-2">
              {(["solo", "small", "medium", "large"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => update("size", s)}
                  className={`py-3 rounded text-sm capitalize border transition ${
                    ctx.size === s
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                      : "bg-[var(--bg-elev2)] border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                >
                  {s === "solo" ? "Solo" : s === "small" ? "2–10" : s === "medium" ? "11–50" : "50+"}
                </button>
              ))}
            </div>
          </Field>
        </section>
      )}

      {step === 2 && (
        <section className="card p-6 flex flex-col gap-5">
          <h2 className="text-xl font-semibold">Where you operate</h2>
          <Field label="Primary country">
            <div className="grid grid-cols-6 gap-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  onClick={() => update("country", c)}
                  className={`py-3 rounded text-sm border transition ${
                    ctx.country === c
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                      : "bg-[var(--bg-elev2)] border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Languages you work in (pick all that apply)">
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => toggleArray("languages", l)}
                  className={`px-4 py-2 rounded text-sm uppercase border transition ${
                    ctx.languages.includes(l)
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                      : "bg-[var(--bg-elev2)] border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </section>
      )}

      {step === 3 && (
        <section className="card p-6 flex flex-col gap-5">
          <h2 className="text-xl font-semibold">What you do & how you sound</h2>
          <Field label="What does your company do? (2–3 sentences)">
            <textarea
              value={ctx.what_you_do}
              onChange={(e) => update("what_you_do", e.target.value)}
              rows={4}
              placeholder="We run a small e-commerce selling handmade leather goods to US and EU customers..."
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="Tone and voice">
            <textarea
              value={ctx.tone}
              onChange={(e) => update("tone", e.target.value)}
              rows={3}
              placeholder="Warm, direct, a bit nostalgic. We avoid corporate jargon. Short sentences."
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
        </section>
      )}

      {step === 4 && (
        <section className="card p-6 flex flex-col gap-5">
          <h2 className="text-xl font-semibold">Volume & priorities</h2>
          <Field label="Expected volume per month">
            <input
              value={ctx.expected_volume}
              onChange={(e) => update("expected_volume", e.target.value)}
              placeholder="~10 contracts reviewed, ~4 blog posts, 50+ support tickets..."
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="Turnaround you need">
            <div className="grid grid-cols-4 gap-2">
              {([
                { id: "urgent", label: "< 4h" },
                { id: "fast", label: "< 24h" },
                { id: "standard", label: "< 48h" },
                { id: "relaxed", label: "1 week+" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => update("turnaround_need", t.id)}
                  className={`py-3 rounded text-sm border transition ${
                    ctx.turnaround_need === t.id
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                      : "bg-[var(--bg-elev2)] border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Priorities (pick top 3)">
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => toggleArray("priorities", p)}
                  className={`px-3 py-2 rounded text-xs border transition ${
                    ctx.priorities.includes(p)
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                      : "bg-[var(--bg-elev2)] border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Constraints (compliance, vendor restrictions, etc. — optional)">
            <textarea
              value={ctx.constraints}
              onChange={(e) => update("constraints", e.target.value)}
              rows={3}
              placeholder="GDPR compliant. No OpenAI. No work on Sundays."
              className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
        </section>
      )}

      {step === 5 && (
        <section className="flex flex-col gap-5">
          <div className="card p-6 flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Your context.md is ready</h2>
            <p className="text-sm text-[var(--text-dim)]">
              This is what squads see when you request a quote. Saved in your browser.
            </p>
            <pre className="text-xs bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-4 overflow-auto whitespace-pre-wrap">
              {markdown}
            </pre>
          </div>

          <div className="card p-6 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-[var(--text-dim)]">Next step</div>
              <div className="text-lg font-semibold mt-1">Browse squads & request your first quote</div>
            </div>
            <Link
              href="/"
              className="bg-[var(--accent)] hover:opacity-90 px-6 py-3 rounded text-sm font-semibold"
            >
              Browse squads →
            </Link>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
          disabled={step === 1}
          className="text-sm text-[var(--text-dim)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← back
        </button>
        {step < 5 && (
          <button
            onClick={() => setStep((s) => (s < 5 ? ((s + 1) as Step) : s))}
            disabled={!canAdvance()}
            className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2 rounded text-sm font-semibold"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">{label}</span>
      {children}
    </label>
  );
}
