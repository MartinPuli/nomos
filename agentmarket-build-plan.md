# AgentMarket — 5-Hour Build Plan

> Execution plan for [agentmarket-plan.md](agentmarket-plan.md). Hour-by-hour, role-by-role, with concrete deliverables and cut lines.

## Pre-flight (T-30 min, before clock starts)

Done before the timer:

- [ ] **Roles assigned**: FS / BE / W3 / Product (1 person per role; if solo, see "Solo mode" at bottom).
- [ ] **API keys ready**: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` (5K req/hr), Sepolia RPC URL (Alchemy/Infura), test wallet with Sepolia ETH (faucet → ≥0.1 ETH).
- [ ] **Repo skeleton** pushed to a single `agentmarket/` GitHub repo with 4 folders: `frontend/`, `backend/`, `contracts/`, `fixtures/`.
- [ ] **Reusable code scan**: skim `buildersclaw/` (already cloned) — `buildersclaw-app` (FE patterns), `buildersclaw-agent` (Claude orchestration), `buildersclaw-contracts` (escrow Solidity). **Lift, don't fork**.
- [ ] **Demo goal locked**: *"Launch a new SaaS product — design the pricing architecture, write the landing page, and format the FAQ."*
- [ ] **Slack/Discord channel** open for the team. Shared Notion or pinned chat for fixtures URLs + escrow address.

## Hour 0 → 1 — Foundations & contracts

Goal at end of hour 1: each role has a runnable skeleton; `/agents` endpoint serves seeded fixtures; FS can render a marketplace card.

### BE (Backend / AI)

- [ ] FastAPI app skeleton: `GET /health`, `GET /agents`, `POST /classify`, `POST /orchestrate`.
- [ ] Hardcode `MODEL_RATES` constant + `agent_quality_score()` + `task_price_eth()` from spec §6.
- [ ] **`GET /agents` returns the 5 seeded fixtures** (from Product) — no GitHub call yet.
- [ ] Stub `POST /classify` returning `{tier: "moderate", reason: "stub", estimated_tokens: 1000}` — real Haiku call comes hour 2.
- [ ] Anthropic SDK installed, key tested with a hello-world Sonnet call.

### FS (Frontend)

- [ ] Next.js 14 + Tailwind + shadcn/ui scaffolded.
- [ ] Two routes: `/` (Marketplace feed), `/orchestrate` (Orchestration dashboard).
- [ ] Marketplace fetches `GET /agents`, renders card grid with: name, model tier badge, token efficiency score, ETH price.
- [ ] Wagmi installed + WalletConnect button (testnet only). Doesn't need to do anything yet.

### W3 (Web3 / Contracts)

- [ ] Solidity escrow contract drafted: `lockFunds(taskId, agentWallet, amount)`, `release(taskId)`, `refund(taskId)`.
- [ ] Foundry or Hardhat project initialized. Local test passes.
- [ ] **`MOCK_MODE` flag implemented in BE** — `release()` returns a fake tx hash if `MOCK_MODE=true`. **Build this before the real contract.**

### Product

- [ ] **5 seeded agents** committed as `fixtures/agents.json`:
  1. `copywriter-pro` (Sonnet, avg 1100 tokens, success 0.94)
  2. `seo-specialist` (Sonnet, avg 1400 tokens, success 0.88)
  3. `pricing-architect` (Opus, avg 3200 tokens, success 0.91)
  4. `faq-formatter` (Haiku, avg 340 tokens, success 0.97)
  5. `tweet-thread-writer` (Sonnet, avg 900 tokens, success 0.85)
- [ ] **3 sample GitHub repos** spun up (or pointed to existing ones) with `skills.md` + `memory/metrics.json` for the live-registration moment in the demo.
- [ ] Demo goal **rehearsed once on paper**: which agent fires first, expected savings %.

**Hour 1 gate:** FS sees 5 cards. BE responds to all 4 endpoints (even if stubs). W3 has `MOCK_MODE` working. ❌ No gate-pass → cut a feature.

## Hour 1 → 2 — Core intelligence: classifier + router

Goal at end of hour 2: a real Haiku call classifies a subtask; a real Sonnet orchestrator decomposes the demo goal.

### BE

- [ ] **`POST /classify`** real Haiku call with the prompt from spec §6. Returns valid JSON. Add `FORCE_ROUTING` env override for demo safety.
- [ ] **Orchestrator** = Sonnet `tool_use` loop with one tool: `search_marketplace(skills: list[str]) -> agents`. System prompt restricts to that tool only.
- [ ] **`POST /orchestrate {goal}`** flow: orchestrator decomposes → for each subtask, call `/classify` → map to model → fire subagent → log tokens → compute price → emit event to FE via SSE or polling.
- [ ] Subagent execution = direct Anthropic call on the routed model with the agent's system prompt baked from `skills.md`.

### FS

- [ ] **Orchestration dashboard**: input box for goal, "Run" button.
- [ ] Live task list rendering as events arrive: `subtask description | model badge (animated reveal) | status (queued → working → done) | actual tokens | ETH cost`.
- [ ] **Cost panel** (top right): naive (all-Opus) total vs actual routed total vs **savings %**. Big bold number.

### W3

- [ ] Deploy escrow to **Sepolia** (real). Save address, ABI to `contracts/deployments.json`.
- [ ] BE wired to call `lockFunds()` and `release()` with ethers.js. **Both real-mode and `MOCK_MODE` paths working side by side.**
- [ ] `sanitize_eth(amount)` util: floor to 6 decimals, reject zero/negative.

### Product

- [ ] Run the demo goal end-to-end **at least 3 times**. Record:
  - Does it produce 3+ subtasks? (Need ≥3 for the dramatic split.)
  - Do they classify into different tiers? (If all → Sonnet, **rewrite the goal** — that's the demo killer.)
  - Is savings % ≥ 60%? If not, tweak the goal.
- [ ] Lock the final demo goal in `fixtures/demo_goal.txt`.

**Hour 2 gate:** End-to-end run from goal input → 3 routed tasks → savings number on screen. Either real testnet or mock mode — both fine. ❌ No gate-pass → switch fully to `MOCK_MODE`, cut testnet from demo, sell it as "v2 ships next week".

## Hour 2 → 3 — GitHub registration + agent detail page

Goal at end of hour 3: live agent registration works for at least one repo; agent cards click through to a detail view.

### BE

- [ ] **`POST /register {github_url}`**: fetches `skills.md` + `memory/metrics.json` + commit count → builds agent record → upserts to in-memory store.
- [ ] Fallback values per spec when `metrics.json` missing: `token_avg=4000`, `success_rate=0.75`.
- [ ] Token efficiency now feeds into **default model tier suggestion** for that agent.

### FS

- [ ] **Agent detail page** `/agents/[id]`: skills list (parsed tags), model tier badge, per-tier `avg_tokens_per_task`, success rate, score breakdown, current ETH price for a 1000-token task.
- [ ] **Registration form** at `/register`: GitHub URL input → POST → toast → agent appears in feed. **This is the live-demo wow moment for "any GitHub repo can join".**

### W3

- [ ] **Tx hash display component** (lifted to FS): polls `eth_getTransactionByHash`, shows pending → confirmed with Sepolia explorer link.
- [ ] Pre-sign a tx for the demo goal as fallback in `fixtures/demo_tx.json`.

### Product

- [ ] Pre-register the **3 sample repos** so the demo feed has real-GitHub-sourced agents alongside fixtures.
- [ ] Take a screenshot of the working dashboard mid-run as backup if the live demo dies.

**Hour 3 gate:** A judge could hand us a GitHub URL on stage and we'd register it in 5 seconds.

## Hour 3 → 4 — Polish & demo path lock

Goal at end of hour 4: the 2-min demo runs cleanly twice in a row.

- [ ] **All four roles do a full demo dry-run together.** Time it. Note every glitch.
- [ ] **FS polish**: animations on tier badges (badge slides in when classified), savings counter ticks up smoothly, model tier colors consistent (Haiku=green, Sonnet=blue, Opus=purple).
- [ ] **BE polish**: orchestrator system prompt hardened — restrict subtask count to 3–5, force tier diversity if needed via the prompt.
- [ ] **`REPLAY_MODE` flag** in BE: serves a pre-recorded successful run from `fixtures/demo_replay.json`. Test it works.
- [ ] **Agent cards** show ETH price + USD equivalent (judges aren't crypto-native).
- [ ] **Error states** — what happens if classifier returns invalid JSON? Default to `moderate`. Log silently.
- [ ] **README** for the repo with one-line setup + demo command.

**Hour 4 gate:** Two clean back-to-back demo runs. ❌ Glitches → switch demo to `REPLAY_MODE` and rehearse the fallback narrative.

## Hour 4 → 5 — Rehearsal, recording, cushion

- [ ] **Record a screen capture** of a successful end-to-end run. This is the fallback if everything dies on stage.
- [ ] **Speaker rehearses the 2-min script** ≥3 times against the live UI. Note exact words to say at each visual cue.
- [ ] **Pre-fund** test wallets with extra Sepolia ETH so escrow doesn't fail on stage.
- [ ] **Network test** at venue — Sepolia RPC reachable? GitHub API reachable? Switch to `MOCK_MODE` if iffy.
- [ ] **Backup laptop / hotspot** ready.
- [ ] **Final commit + push** with tag `demo-final`. Open the demo URL on the presentation laptop.
- [ ] **Cushion buffer**: last 30 min reserved for the unknown unknown. Do **not** add features in this window.

## File / repo structure

```
agentmarket/
├── frontend/                  # Next.js 14
│   ├── app/
│   │   ├── page.tsx           # Marketplace feed
│   │   ├── orchestrate/page.tsx
│   │   ├── agents/[id]/page.tsx
│   │   └── register/page.tsx
│   ├── components/
│   │   ├── AgentCard.tsx
│   │   ├── ModelTierBadge.tsx
│   │   ├── SavingsPanel.tsx
│   │   ├── TaskRow.tsx
│   │   └── TxHashLink.tsx
│   └── lib/api.ts
├── backend/                   # FastAPI
│   ├── main.py                # routes
│   ├── classifier.py          # Haiku call + prompt
│   ├── orchestrator.py        # Sonnet tool_use loop
│   ├── pricing.py             # MODEL_RATES, score, price
│   ├── github.py              # register / fetch skills + metrics
│   ├── escrow.py              # ethers.js bridge / MOCK_MODE
│   └── fixtures_loader.py
├── contracts/                 # Foundry/Hardhat
│   ├── src/Escrow.sol
│   ├── deployments.json       # Sepolia address + ABI
│   └── test/Escrow.t.sol
├── fixtures/
│   ├── agents.json            # 5 seeded agents
│   ├── demo_goal.txt
│   ├── demo_replay.json       # for REPLAY_MODE
│   └── demo_tx.json           # pre-signed tx fallback
└── README.md
```

## Cut list (in order, if behind schedule)

Drop these without touching the demo narrative:

1. **`/register` GitHub flow** — replace with "imagine a developer dropping a repo URL here". Fixtures only.
2. **Agent detail page** — collapse into a card hover state.
3. **Real Sepolia testnet** — full `MOCK_MODE`. Pre-signed tx hash displayed. Sell as "audit-ready, demo-safe".
4. **Wagmi wallet connect** — show a hardcoded wallet pill.
5. **Live classifier call** — full `FORCE_ROUTING` from fixtures. (Last resort — kills the "real intelligence" claim.)

**Never cut:** the **savings counter**. That's the entire pitch. If only one feature ships polished, it's that.

## Solo mode (if the 5h is one person)

Drop to absolute minimum:

- 100% `MOCK_MODE` (no contracts written, hardcoded tx hashes)
- No `/register` flow (only fixtures)
- One Next.js app with API routes (skip FastAPI)
- Real `/classify` Haiku call + real orchestrator Sonnet call (these ARE the demo)
- Real cost computation (this IS the headline)

Estimated solo time: 3.5h core + 1h polish + 0.5h rehearsal.

## Demo run checklist (T-5 min before pitch)

- [ ] Browser tabs: Marketplace / Orchestration / Sepolia explorer (or mock view).
- [ ] Network on, RPC reachable.
- [ ] `REPLAY_MODE` ready to toggle if live run fails mid-pitch.
- [ ] Recording open in another tab as last-resort fallback.
- [ ] Speaker has water + the script printed.
- [ ] Wallet has Sepolia ETH.
- [ ] Phone on silent.
