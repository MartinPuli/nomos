# Nomos

**Rent-a-team marketplace for AI agents.** Browse pre-assembled squads of specialist agents, rent one per task, and an internal compute router makes sure every subtask runs on the cheapest Claude model that can still do the work well. Live savings vs a naive all-Opus baseline.

> Nomos (νόμος) — Greek for *law, custom, order*. The law of compute routing.

## The idea

Most multi-agent systems overspend because they default to one strong model for everything. Nomos flips this:

1. **User rents a squad** — a curated team of agents with a shared mission (launch, growth, architecture, content ops, research).
2. **User hands the squad a goal** — e.g. *"Launch a new SaaS: design pricing, write the landing, format the FAQ."*
3. **Orchestrator (Sonnet, `tool_use`)** decomposes the goal into 3–5 subtasks.
4. **Classifier (Haiku)** labels each subtask: `simple | moderate | complex`.
5. **Router** maps the label to the cheapest model that can do the work well (`simple → Haiku`, `moderate → Sonnet`, `complex → Opus`) and picks an agent **from inside the rented squad**.
6. **Each agent executes** on its assigned model. Tokens are counted for real.
7. **Savings panel** shows naive (all-Opus) vs routed actual vs **saved %** — live.

The moat isn't the marketplace — it's the router. The marketplace is distribution.

## Featured squads (seeded)

| Squad | Specialty | Members | Avg savings |
| --- | --- | --- | --- |
| 🚀 Product Launch Squad | Launches & go-to-market | copywriter + SEO + social + formatter | 68% |
| 🏛 SaaS Architecture Squad | Product strategy + system design | pricing arch + tech arch + copy | 41% |
| 🌐 Content Pipeline Squad | Multilingual ops, summarization | translator + formatter + data analyst | 83% |
| 📈 Growth Marketing Squad | Distribution & growth content | SEO + social + copy | 59% |
| 🔬 Full-Stack Research Squad | Technical research memos | data + tech arch + copy + formatter | 50% |

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Backend | Next.js API routes, in-memory store |
| AI | `@anthropic-ai/sdk`, Claude Haiku (classifier), Sonnet (orchestrator + moderate), Opus (complex) |
| Live UI | SSE streaming from `/api/orchestrate` |
| Registration | GitHub REST API (reads `skills.md` + `memory/metrics.json` + 90d commits) |

## Repository layout

```text
nomos/
├── app/                               # Next.js 16 product
│   ├── src/app/                       # Routes + API
│   ├── src/components/                # UI
│   ├── src/lib/                       # classifier, router, orchestrator, executor, pricing, store
│   └── src/fixtures/                  # 8 agents + 5 teams seed data
├── docs/superpowers/plans/            # Implementation plan (23 tasks)
├── nomos-plan.md                      # Product spec (v2, compute-optimized)
├── nomos-build-plan.md                # 5-hour execution schedule
└── README.md                          # this file
```

## Run locally

```bash
cd app
pnpm install
cp .env.local.example .env.local   # set ANTHROPIC_API_KEY
pnpm dev
```

Then open <http://localhost:3000>.

## Deploy to Vercel

1. Import `MartinPuli/nomos` on <https://vercel.com/new>.
2. **Root Directory → `app`** (critical — the Next.js project is a subdirectory).
3. Set `ANTHROPIC_API_KEY` in Environment Variables.
4. Deploy.

## Demo goal that shows max drama

> Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes.

Pre-loaded on `/orchestrate`. Naturally splits into Opus (pricing), Sonnet (landing), Haiku (FAQ).

## Demo-safety flags

- `MOCK_MODE=1` — disables GitHub registration, fixtures only
- `FORCE_ROUTING=pricing=complex,landing=moderate,faq=simple` — pin classifier output per keyword if live classification drifts during a pitch

## Planning docs

- [`nomos-plan.md`](./nomos-plan.md) — product vision, architecture, pricing, demo narrative, risks, long-term direction
- [`nomos-build-plan.md`](./nomos-build-plan.md) — 5-hour execution plan
- [`docs/superpowers/plans/2026-04-14-nomos-core.md`](./docs/superpowers/plans/2026-04-14-nomos-core.md) — 23-task implementation plan that the app was built against
