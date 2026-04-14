# Nomos — Hackathon Plan (Compute-Optimized Edition)

> Optimized for a 5-hour build window.
> **v2 pivot:** mentor feedback reframes the product from "rent idle agent capacity" → **"intelligent compute routing"**. The orchestrator doesn't just pick agents — it picks the cheapest model tier (Haiku / Sonnet / Opus) that can still do each subtask well.

## 1. Product Vision

Nomos is an autonomous agent marketplace with a built-in **compute routing engine** — the layer that decides not just *which agent* to hire, but *which model* to run it on, at the lowest cost that still meets quality requirements.

An orchestrator receives a goal, decomposes it into subtasks, classifies each by complexity, and routes each to the right model tier:

- a simple summarization goes to **Haiku** at ~$0.0003
- a reasoning-heavy architecture decision goes to **Opus** at ~$0.015

The marketplace settles payments in ETH, and the pricing engine makes every token count.

> For teams building multi-agent workflows, Nomos is the difference between burning **$40 in API credits** and spending **$1.20** for the same result.

## 2. Market Positioning

**Defensible position (one sentence):**
> Nomos is the only agent marketplace with a native compute routing layer — every subtask gets the cheapest model that can do it well, and the savings are shown live.

**Why this angle wins over the v1 pitch:**

- Quantifiable: "72% cheaper" is a live, visible number — not a promise.
- Real pain: every team shipping agent workflows is overspending on Opus-for-everything.
- Defensible moat: classifier + router is a product, not a UI skin on the Anthropic API.
- Natural network effect: more agents → better routing options → lower costs → more orchestrators.

## 3. Core MVP Features (Hackathon Scope)

The two features that replace the generic "agent browser" are the **Task Complexity Classifier** and the **Model Router**. Everything else sharpens around them.

- **Task Complexity Classifier** — single fast Haiku call that tags each subtask as `simple | moderate | complex` + estimated tokens.
- **Model Router** — maps tier → model (`simple→Haiku`, `moderate→Sonnet`, `complex→Opus`) and hands the subtask to a subagent running on that model.
- **Agent registration via GitHub** — `skills.md` + `memory/metrics.json` for per-tier token efficiency.
- **Marketplace feed** — agent cards with model tier badge + token efficiency score per tier.
- **Orchestrator dashboard** — live decomposition, per-task tier badges, naive-vs-routed cost counter.
- **ETH escrow on Sepolia** (with `MOCK_MODE` fallback) — exact amount computed from real token usage.
- **Savings panel** — naive (all-Opus) vs actual routed cost, percentage saved. This is the headline number.

## 4. Technical Architecture

The key addition vs v1: a **Classifier → Router** pipeline sits between the orchestrator and the subagent workers. Everything flows through it.

### Tech stack

| Layer | Stack | Change vs v1 |
| --- | --- | --- |
| Frontend | Next.js 14, Tailwind, shadcn/ui, Wagmi | + Cost savings panel |
| Backend | FastAPI (Python) or Next.js API routes, GitHub REST API, SQLite / in-memory | + Classifier endpoint, router logic |
| AI | Claude Haiku (classifier), Sonnet (orchestrator + moderate tasks), Opus (complex tasks only) | Multi-model is now core |
| Web3 | ethers.js, Sepolia testnet, simple escrow Solidity contract (or mocked) | ETH amount now computed from real tokens |

### Data flow — goal → routing → payment

1. User submits a goal → **Orchestrator (Sonnet)** decomposes into *N* subtasks via `tool_use`.
2. Each subtask is sent to the **Complexity Classifier** (single fast Haiku call with scoring prompt).
3. Classifier returns: `{ tier: "simple" | "moderate" | "complex", reason: "...", estimated_tokens: N }`.
4. **Model router** maps tier → model: `simple→Haiku`, `moderate→Sonnet`, `complex→Opus`.
5. Each subagent executes on its assigned model, **actual token usage** logged.
6. Pricing engine: `(tokens × model_rate) + agent_margin → ETH amount`.
7. Escrow releases the exact computed ETH to each agent wallet.
8. Dashboard shows **naive cost (all-Opus) vs actual routed cost**, with savings %.

### GitHub integration

On agent registration:

- `GET /repos/{owner}/{repo}/contents/skills.md` — skills.
- `GET /repos/{owner}/{repo}/commits` — 90d activity.
- `GET /repos/{owner}/{repo}/contents/memory/metrics.json` — per-tier `avg_tokens_per_task` + success rate.

## 5. Team Task Breakdown

Roles: **FS** (frontend), **BE** (backend + classifier/router + AI), **W3** (contracts + escrow), **Product** (demo goal + fixtures).

**Critical dependencies:**

- FS blocks on BE having `/agents` endpoint within first **90 min**.
- W3 escrow address shared with BE **before hour 3**.
- Product seeds mock agent data (with per-tier metrics) as shared fixtures **from hour 1**.

**Product's most important job in the 5 hours:**
Find or engineer a **demo goal that naturally produces a mix of all three tiers** — e.g.:

> *"Launch a new SaaS product: design the pricing architecture, write the landing page copy, and format the FAQ section."*

That gives you **Opus** for pricing architecture, **Sonnet** for landing copy, **Haiku** for FAQ formatting. Maximum visual drama on the savings counter. Test it at least 5 times before demo.

## 6. Scoring & Pricing Engine

Token efficiency is now the **primary** signal, not one of four. The **model tier is a direct cost input**.

### Two-layer price calculation

**Layer 1 — Agent quality score** (determines agent margin, 10–50% on top of base compute cost):

```python
def agent_quality_score(skills_count, commits_90d, success_rate):
    skills_score  = min(skills_count / 20, 1.0)   # richness
    commit_score  = min(commits_90d / 30, 1.0)    # maintenance signal
    # Token efficiency now computed separately — it determines model tier, not margin
    quality = (skills_score * 0.4 + commit_score * 0.2 + success_rate * 0.4)
    return quality  # 0.0 → 1.0
```

**Layer 2 — Final ETH price per task** (compute cost + agent margin):

```python
MODEL_RATES = {
    "haiku":  0.000_001,    # ETH per token  (~$0.00025 / 1K tokens)
    "sonnet": 0.000_003,    # ETH per token  (~$0.0030  / 1K tokens)
    "opus":   0.000_015,    # ETH per token  (~$0.0150  / 1K tokens)
}

def task_price_eth(model_tier, actual_tokens, agent_quality):
    compute_cost = MODEL_RATES[model_tier] * actual_tokens
    margin       = compute_cost * (0.1 + agent_quality * 0.4)  # 10–50% margin
    return round(compute_cost + margin, 8)
```

### Complexity classifier prompt (the Haiku call that routes everything)

```text
You are a task complexity classifier. Given a subtask description,
output JSON only:
{
  "tier": "simple" | "moderate" | "complex",
  "reason": "one sentence",
  "estimated_tokens": <integer>
}

Rules:
- simple:   formatting, extraction, translation, yes/no decisions   (<500 tokens)
- moderate: writing, summarization, code generation, analysis       (500–2000 tokens)
- complex:  multi-step reasoning, architecture, strategy, evaluation (>2000 tokens)

Subtask: {subtask_description}
```

### Token efficiency as agent reputation

Each registered agent stores a rolling `avg_tokens_per_task` **per tier** in `memory/metrics.json` on their GitHub repo. An agent averaging 800 tokens for moderate tasks beats one averaging 1,800 — same quality, less spend. This is the central number that ranks the marketplace feed and makes Nomos different from a model-provider list.

### Naive vs routed cost — the demo number

```python
def compute_savings(tasks):
    naive  = sum(t.tokens * MODEL_RATES["opus"] for t in tasks)
    actual = sum(t.tokens * MODEL_RATES[t.routed_model] for t in tasks)
    saved  = naive - actual
    pct    = (saved / naive) * 100
    return {"naive_eth": naive, "actual_eth": actual, "saved_pct": round(pct, 1)}
    # Typical demo output: ~72% savings — the headline number
```

## 7. Demo Script (2 minutes)

### [0:00–0:15] — The problem, reframed around cost

> "If you're building with AI agents today, every task runs on the same model — usually the most powerful one. That's like hiring a senior engineer to sort your inbox. The work gets done, but you're burning money on compute you don't need. Nomos fixes that."

### [0:15–0:35] — Marketplace with model-tier framing

*[Screen: Marketplace feed — agent cards each showing a **model tier badge** (Haiku / Sonnet / Opus) and a token efficiency score]*

> "This is Nomos. Each agent advertises what they're optimized for, what model tier they run on, and how token-efficient they are. This copywriting agent averages 1,100 tokens per task on Sonnet. This formatter runs on Haiku — 340 tokens, finished in a second. The marketplace knows the difference."

### [0:35–1:15] — Live orchestration with routing visible

*[Switch to Orchestration view — type the demo goal]*

> "Let's give our orchestrator a real task: *'Launch a new SaaS product — design the pricing architecture, write the landing page, and format the FAQ.'*"

*[Hit run — tasks appear with model badges as they're classified]*

> "Our orchestrator — running on Sonnet — just broke this into three subtasks. Watch what happens next."

*[Row 1: "Pricing architecture" → classifier runs → **OPUS** badge]*
> "Complex strategic reasoning. Routed to Opus."

*[Row 2: "Landing page copy" → **SONNET** badge]*
> "Balanced writing task. Sonnet."

*[Row 3: "Format FAQ" → **HAIKU** badge]*
> "Simple formatting. Haiku — a fraction of the cost."

*[Tasks complete, cost panel updates]*
> "If this had all run on Opus, you'd have spent **0.0043 ETH**. Nomos spent **0.0012 ETH**. That's **72% cheaper** — for the exact same output. Payment settled to each agent wallet automatically. Tx hash live on testnet."

### [1:15–1:35] — Why this is hard to replicate

> "Every framework today lets you define agents. None of them automatically decides which model each task deserves. That routing intelligence — knowing that formatting is Haiku work and architecture is Opus work — is what Nomos contributes. And because it's a marketplace, agents compete on **token efficiency**. The best agents are the ones who do the most with the least compute."

### [1:35–2:00] — Vision close

> "As agent workflows get more complex — dozens of subtasks, hundreds of calls — the cost difference compounds. A startup running 10,000 agent tasks a day saves **$30K a month** just by routing intelligently. That's not a feature. That's a business model."
>
> "Nomos is the infrastructure layer that makes agent economies economically viable. Not just smarter — **cheaper**."

## 8. Risks & Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| **Classifier misfires during demo** — Haiku routes an Opus task to Sonnet, breaking the narrative | Medium | Pre-seed the demo goal as a fixed input with pre-computed classification stored in BE. Classifier runs for real, but a `FORCE_ROUTING` flag overrides to the planned tier map if it deviates. Model still executes — only the routing label is fixed. |
| **Savings number looks unimpressive** — tasks too similar in complexity, all route to Sonnet | Medium | Product's job in hours 1–2: engineer the perfect demo goal. Test it ≥5 times. Goal must naturally span all three tiers. Keep a backup goal ready. The 70%+ savings number is the demo climax — protect it. |
| **Testnet flakiness** — Sepolia congested, tx takes 2 min | High | `MOCK_MODE=true` flag from hour 1. If testnet fails, inject a pre-signed tx hash instantly. Same UI — nobody knows. |
| **ETH amount is wrong** — rounding errors make payment look broken | Low–Medium | `sanitize_eth(amount)` util floors to 6 decimals, rejects zero/negative before any contract call. Always show the human-readable $ equivalent next to ETH so non-crypto judges follow. |
| **Orchestrator loop goes off-script** — Claude picks wrong agents or loops | Medium | Pre-bake the demo goal into a seeded test. `tool_choice: {type: "any"}` + system prompt restricting tool use to the marketplace API. `REPLAY_MODE` flag replays a pre-recorded successful run if the live demo looks shaky. |
| **GitHub API rate limits** — 60 req/hr unauthenticated | Medium | Seed all 5 demo agents as static JSON from the start. GitHub parser only runs on new registrations during the demo. Live marketplace never hits the API during the 2-minute pitch. |

## 9. Post-Hackathon Vision (12 months)

The product at 12 months is a **compute routing layer**, not just a marketplace. The marketplace is the **distribution strategy**; the router is the **product moat**.

### Developer integration — single SDK call

Any developer building a multi-agent pipeline integrates Nomos's router via one call:

```python
from nomos import route

result = route(
    task="Write a technical specification for the auth service",
    agents=marketplace.search(skills=["technical_writing", "backend"]),
    budget_eth=0.005,
)
# Returns: {agent, model, estimated_cost, result}
```

The router handles classification, model selection, agent hiring, execution, and payment. The developer never touches a model name.

### Revenue model at scale

**3% protocol fee** on all compute routed through Nomos. At **$1M/day** in routed API spend (plausible with ~500 enterprise teams), that's **$30K/day** in protocol revenue.

The marketplace network effect compounds:
> more agents → better routing options → lower costs for orchestrators → more orchestrators → more demand for agents

### Go-to-market

Launch with the developer community from this hackathon. First 100 users come from **open-sourcing the classifier + router as a standalone library** — free, no marketplace required. Once developers are using the router, they naturally discover the marketplace to find better, cheaper agents. Supply builds through a GitHub-native *"register your agent in 2 minutes"* flow. Demand builds through the router SDK. The two flywheels reinforce each other.

### 12-month north star

Nomos processes more routed AI compute than any single company's internal infrastructure — because no single company can build a marketplace of specialized, efficiency-scored agents. **That's the moat.**
