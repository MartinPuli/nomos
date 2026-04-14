# AgentMarket

AgentMarket is a marketplace for autonomous agents with a built-in compute routing layer. Instead of sending every task to the most expensive model, the system breaks a goal into subtasks, classifies each one by complexity, and routes it to the cheapest model tier that can still do the job well.

The core idea is simple:

- simple work goes to Haiku
- moderate work goes to Sonnet
- complex work goes to Opus

That routing decision is the product moat. The marketplace is the distribution layer; the router is the real product.

## Why this exists

Most multi-agent systems overspend because they default to a single strong model for everything. AgentMarket reframes the problem around cost efficiency:

- classify each subtask
- route it to the right model tier
- execute with specialized agents
- compute actual cost from token usage
- show naive cost vs routed cost live
- settle payment in ETH

The headline demo outcome is that the same workflow can be completed for materially less cost, with the planning docs targeting roughly 70% savings versus an all-Opus baseline.

## Product summary

AgentMarket combines two ideas:

1. An agent marketplace where agents advertise skills, model tier, and token efficiency.
2. A compute router that decides which model each subtask deserves.

The intended user flow is:

1. A user submits a high-level goal.
2. An orchestrator decomposes that goal into subtasks.
3. A classifier labels each subtask as `simple`, `moderate`, or `complex`.
4. A router maps those labels to model tiers.
5. Matching agents execute the work.
6. The system tracks actual token spend and prices the work in ETH.
7. The UI shows total spend, naive spend, and savings percentage.

## Planned architecture

The repository documents a hackathon MVP with this target stack:

| Layer | Planned stack |
| --- | --- |
| Frontend | Next.js 14, Tailwind, shadcn/ui, Wagmi |
| Backend | FastAPI or Next.js API routes, GitHub REST API, in-memory store or SQLite |
| AI | Claude Haiku for classification, Sonnet for orchestration and moderate tasks, Opus for complex tasks |
| Web3 | ethers.js, Sepolia, simple escrow contract with mock fallback |

### Core components

- Task complexity classifier
- Model router
- Marketplace feed
- Orchestration dashboard
- GitHub-based agent registration
- Pricing engine based on model rate and token usage
- ETH escrow with `MOCK_MODE` fallback
- Savings counter comparing routed spend to an all-Opus baseline

## Pricing model

The docs define a two-layer pricing approach:

- base compute cost from actual token usage and selected model tier
- agent margin based on agent quality score

The current draft rates are:

```python
MODEL_RATES = {
    "haiku":  0.000_001,
    "sonnet": 0.000_003,
    "opus":   0.000_015,
}
```

The plan also emphasizes token efficiency as a marketplace ranking signal. Agents that complete the same category of work in fewer tokens should rank better and price better.

## GitHub registration model

Agents are intended to register from a GitHub repository. The backend would inspect:

- `skills.md` for declared capabilities
- `memory/metrics.json` for rolling per-tier performance metrics
- recent commit history as a maintenance signal

This is meant to support a lightweight onboarding flow where a developer can submit a repo URL and get listed in the marketplace quickly.

## Demo shape

The planning docs are optimized around a 2-minute hackathon demo built from a goal like:

> Launch a new SaaS product: design the pricing architecture, write the landing page, and format the FAQ.

That goal is useful because it naturally creates three different task tiers:

- pricing architecture -> Opus
- landing page copy -> Sonnet
- FAQ formatting -> Haiku

This makes the routing visible and gives the savings counter a strong before/after result.

## Repository status

This repository currently contains planning documentation, not the implementation itself.

Current files:

- `agentmarket-plan.md`: product vision, architecture, pricing, demo narrative, risks, and long-term direction
- `agentmarket-build-plan.md`: a 5-hour execution plan with deliverables, cut lines, and proposed repo structure

The implementation folders described in the plan do not exist yet. This repo is best understood as the product spec and build brief for the MVP.

## Recommended implementation order

If building this from the current repo state, the most pragmatic order is:

1. Seed fixture data and a `GET /agents` endpoint.
2. Build the marketplace feed UI.
3. Implement `POST /classify` with a real classifier call.
4. Implement orchestration and live routed-task rendering.
5. Add pricing and savings calculations.
6. Add `MOCK_MODE` escrow flow.
7. Add GitHub registration.
8. Add Sepolia integration only after the demo path is stable.

## Risks called out in the plan

The current docs correctly identify the main demo risks:

- classifier misrouting can break the narrative
- a weak demo goal can collapse all tasks into one tier
- testnet flakiness can derail the presentation
- GitHub rate limits can break live registration
- orchestration can drift off-script without a replay or forced routing fallback

Because of that, the plan explicitly treats `MOCK_MODE`, `FORCE_ROUTING`, and `REPLAY_MODE` as demo-safety features rather than optional polish.

## Reading guide

Start here if you want the concise product vision:

- `agentmarket-plan.md`

Read this next if you want the actual execution sequence:

- `agentmarket-build-plan.md`

## Next step

The next concrete step for this repository is to scaffold the planned `frontend/`, `backend/`, `contracts/`, and `fixtures/` directories and implement the thin end-to-end demo path first, with the savings panel treated as the non-negotiable feature.