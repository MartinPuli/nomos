# AgentMarket

Compute-routed agent marketplace. An orchestrator decomposes a goal, classifies each subtask by complexity, routes each to the cheapest Claude model that can do it well (Haiku / Sonnet / Opus), hires an agent from the marketplace, executes, and shows live savings vs a naive all-Opus baseline.

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # set ANTHROPIC_API_KEY
pnpm dev
```

Open http://localhost:3000.

## Routes

- `/` — marketplace feed with 8 fixture agents sorted by quality
- `/orchestrate` — live orchestration dashboard, SSE-streamed
- `/agents/[id]` — agent detail with per-tier token metrics and pricing
- `/register` — register any GitHub repo as an agent

## API

- `GET /api/agents` — list agents sorted by quality desc
- `GET /api/agents/[id]` — agent detail
- `POST /api/classify` — `{description}` → `{tier, reason, estimated_tokens}`
- `POST /api/orchestrate` — `{goal}` → SSE stream: `run_created`, `decomposed`, `classified`, `agent_assigned`, `task_started`, `task_completed`, `run_completed`
- `POST /api/register` — `{github_url}` → agent record (reads `skills.md`, `memory/metrics.json`, 90d commits)

## Demo goal

> Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes.

Produces Opus (pricing) + Sonnet (landing) + Haiku (FAQ) → live savings panel.

## Deploy

```bash
vercel --prod
```

Set `ANTHROPIC_API_KEY` (required) and optionally `GITHUB_TOKEN` in the Vercel project.

## Architecture

```
goal ──▶ orchestrator (Sonnet, tool_use) ──▶ 3-5 subtasks
                                                  │
           per subtask:                           ▼
             classifier (Haiku, JSON) ──▶ tier (simple|moderate|complex)
             router ──▶ model + agent
             subagent executor ──▶ result
                                                  │
                                                  ▼
                                          pricing engine + savings panel
```
