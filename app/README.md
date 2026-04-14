# Nomos

Compute-routed marketplace for specialist teams. Users primarily rent pre-assembled teams; each team decomposes a goal, classifies each subtask by complexity, routes it to the cheapest Claude model that can still do the work well, assigns it to the right specialist, and shows live savings vs a naive all-Opus baseline.

Individual agents still exist in the marketplace as the supply layer. They can be browsed, registered from GitHub, and assembled into teams, but the main customer-facing workflow is team-first.

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # set ANTHROPIC_API_KEY
pnpm dev
```

Open http://localhost:3000.

## Verification

```bash
npm.cmd test
```

This runs the Vitest suite covering pricing, routing, and GitHub registration helpers.

## Demo ops

See `../docs/demo-checklist.md` for a concise runbook and fallback path for live demos.

## Environment

- `ANTHROPIC_API_KEY` is required for classify, orchestrate, and subagent execution.
- `GITHUB_TOKEN` is optional but recommended for `/api/register`; without it, GitHub rate limits are much lower.
- `MOCK_MODE=1` disables live GitHub registration and keeps the app in fixtures-only mode.
- `FORCE_ROUTING=pricing=complex,landing=moderate,faq=simple` optionally pins classifier output by keyword for demo safety.

If `ANTHROPIC_API_KEY` is missing, API routes now return a clear configuration error instead of a generic failure.

## Routes

- `/` — marketplace of teams (primary) + individual agents (secondary)
- `/orchestrate` — live orchestration dashboard, SSE-streamed; accepts `?team=<id>`
- `/agents/[id]` — agent detail with per-tier token metrics and pricing
- `/teams/[id]` — team detail and launch point for team-scoped orchestration
- `/register` — register any GitHub repo as an agent in the marketplace pool

## API

- `GET /api/teams` — list squads sorted by quality
- `GET /api/teams/[id]` — team detail with members
- `GET /api/agents` — list agents sorted by quality
- `GET /api/agents/[id]` — agent detail
- `POST /api/classify` — `{description}` → `{tier, reason, estimated_tokens}`
- `POST /api/orchestrate` — `{goal, team_id?}` → SSE stream of events (`run_created`, `decomposed`, `classified`, `agent_assigned`, `task_started`, `task_completed`, `run_completed`). If `team_id` is set, routing is scoped to that team's members.
- `POST /api/register` — `{github_url}` → agent record (reads `skills.md`, `memory/metrics.json`, 90d commits)

Error shape for JSON routes:

```json
{
   "success": false,
   "error": {
      "code": "invalid_request",
      "message": "goal is required"
   }
}
```

## Product model

- Teams are the primary marketplace unit users rent.
- Agents are the underlying specialists teams are built from.
- Routing is the core product behavior that determines cost efficiency.
- Registration currently onboards agents, not whole teams.
- Agents can now be visually distinguished as fixture-backed or GitHub-backed in the marketplace and detail views.

## Demo goal

> Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes.

## Demo flow

1. User lands on `/` and picks a squad, e.g. *Product Launch Squad*
2. Clicks the team CTA on the detail page
3. On `/orchestrate?team=product-launch-squad`, pastes a goal:
   > Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes.
4. Runs the team
5. Watches tasks classify live (OPUS / SONNET / HAIKU badges) and the savings panel tick up

## Deploy

```bash
vercel --prod
```

Set `ANTHROPIC_API_KEY` (required) and optionally `GITHUB_TOKEN` in the Vercel project. Root Directory must be `app/` since the Next.js project is a subdirectory of the monorepo.

## Architecture

```text
goal + team_id ──▶ orchestrator (Sonnet, tool_use) ──▶ 3-5 subtasks
                                                            │
           per subtask:                                     ▼
             classifier (Haiku, JSON) ──▶ tier (simple|moderate|complex)
             router ──▶ model + agent FROM TEAM POOL
             subagent executor (Haiku|Sonnet|Opus) ──▶ result
                                                            │
                                                            ▼
                                                pricing engine + savings panel
```
