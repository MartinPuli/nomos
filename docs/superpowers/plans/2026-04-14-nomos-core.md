# Nomos Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core Nomos product in 4.5 hours — a Next.js app where an orchestrator decomposes a goal into subtasks, classifies each by complexity (Haiku), routes each to the cheapest Claude model that can do it well (Haiku / Sonnet / Opus), and shows live compute-cost savings vs a naive all-Opus baseline. No Web3, no payments, no auth — pure cognitive routing demo.

**Architecture:** Next.js 16 full-stack. App Router pages for Marketplace, Orchestration Dashboard, Agent Detail, and GitHub Registration. API routes handle classification, orchestration (SSE streaming), and registration. Core logic lives in `src/lib/`: classifier (Haiku JSON), router (tier→model map), orchestrator (Sonnet `tool_use` decomposition), executor (parallel subagent calls), pricing (model rates + savings calc), in-memory store for agents. 8 pre-seeded fixture agents cover all three tiers. Optional live GitHub registration fetches `skills.md` + `memory/metrics.json` and falls back to defaults. All state is in-memory singleton (no DB, acceptable for demo + serverless-reset resilience via re-seeding on cold start).

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, `@anthropic-ai/sdk`, `framer-motion`, `uuid`. Deploy to Vercel.

**Project root:** `c:/Users/marti/Documents/Martin-Pulitano/cereberus/app/` (already scaffolded with `pnpm create next-app`).

**Env vars required at runtime:**
- `ANTHROPIC_API_KEY` (required — all Claude calls)
- `GITHUB_TOKEN` (optional — raises GitHub rate limit from 60/hr to 5000/hr for `/register`)
- `MOCK_MODE=1` (optional flag — shortcuts to fixtures-only, disables GitHub fetch)
- `FORCE_ROUTING` (optional — e.g. `pricing=complex,landing=moderate,faq=simple` forces classifier output for demo safety)

## File Structure

```
app/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout with <Nav/>
│   │   ├── globals.css                   # Tailwind + tier color tokens
│   │   ├── page.tsx                      # Marketplace feed
│   │   ├── orchestrate/page.tsx          # Orchestration dashboard
│   │   ├── agents/[id]/page.tsx          # Agent detail
│   │   ├── register/page.tsx             # GitHub registration form
│   │   └── api/
│   │       ├── agents/route.ts           # GET list, POST register
│   │       ├── agents/[id]/route.ts      # GET single agent
│   │       ├── classify/route.ts         # POST classify one subtask
│   │       ├── orchestrate/route.ts      # POST goal → SSE stream of events
│   │       └── register/route.ts         # POST GitHub URL → agent record
│   ├── components/
│   │   ├── Nav.tsx                       # Top nav with links
│   │   ├── AgentCard.tsx                 # Marketplace card
│   │   ├── TierBadge.tsx                 # Haiku/Sonnet/Opus pill
│   │   ├── SavingsPanel.tsx              # Naive vs routed vs saved%
│   │   ├── TaskRow.tsx                   # Live subtask row in dashboard
│   │   ├── TeamHeader.tsx                # "Team assembled: 3 agents" strip
│   │   └── GoalInput.tsx                 # Textarea + run button
│   ├── lib/
│   │   ├── types.ts                      # Agent, Task, Tier, etc.
│   │   ├── config.ts                     # env + MOCK_MODE + MODEL_IDS
│   │   ├── anthropic.ts                  # shared Anthropic client
│   │   ├── pricing.ts                    # MODEL_RATES, price, quality, savings
│   │   ├── classifier.ts                 # Haiku classify function
│   │   ├── router.ts                     # tier → model + agent selection
│   │   ├── orchestrator.ts               # Sonnet tool_use decomposition
│   │   ├── executor.ts                   # parallel subagent runs
│   │   ├── store.ts                      # in-memory singleton
│   │   ├── seed.ts                       # fixture loader
│   │   └── github.ts                     # GitHub API fetch helpers
│   └── fixtures/
│       └── agents.json                   # 8 seeded agents
├── .env.local.example
├── vercel.json                           # SSE/runtime config
├── next.config.ts
└── README.md
```

---

## Task 1: Types and config foundation

**Files:**
- Create: `app/src/lib/types.ts`
- Create: `app/src/lib/config.ts`

- [ ] **Step 1: Write `src/lib/types.ts`**

```typescript
export type Tier = "simple" | "moderate" | "complex";
export type ModelId = "haiku" | "sonnet" | "opus";

export interface AgentMetrics {
  avg_tokens_per_task: Partial<Record<Tier, number>>;
  tasks_completed: number;
  tasks_attempted: number;
  success_rate: number;
}

export interface Agent {
  id: string;
  name: string;
  handle: string;
  description: string;
  skills: string[];
  default_tier: Tier;
  github_url?: string;
  metrics: AgentMetrics;
  skills_count: number;
  commits_90d: number;
  quality: number;
  created_at: string;
}

export interface Classification {
  tier: Tier;
  reason: string;
  estimated_tokens: number;
}

export interface SubTask {
  id: string;
  description: string;
  tier: Tier;
  model: ModelId;
  agent_id: string;
  status: "pending" | "classifying" | "routed" | "working" | "done" | "error";
  actual_tokens: number;
  cost_eth: number;
  output?: string;
  classification?: Classification;
  error?: string;
}

export interface OrchestrationRun {
  id: string;
  goal: string;
  created_at: string;
  subtasks: SubTask[];
  total_actual_eth: number;
  total_naive_eth: number;
  saved_pct: number;
  status: "decomposing" | "routing" | "executing" | "done" | "error";
}

export type OrchestrationEvent =
  | { type: "run_created"; run: OrchestrationRun }
  | { type: "decomposed"; subtasks: SubTask[] }
  | { type: "classified"; subtask_id: string; classification: Classification; model: ModelId }
  | { type: "agent_assigned"; subtask_id: string; agent_id: string }
  | { type: "task_started"; subtask_id: string }
  | { type: "task_completed"; subtask_id: string; actual_tokens: number; cost_eth: number; output: string }
  | { type: "task_failed"; subtask_id: string; error: string }
  | { type: "run_completed"; total_actual_eth: number; total_naive_eth: number; saved_pct: number }
  | { type: "error"; message: string };
```

- [ ] **Step 2: Write `src/lib/config.ts`**

```typescript
export const MODEL_IDS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
} as const;

export const ORCHESTRATOR_MODEL = MODEL_IDS.sonnet;
export const CLASSIFIER_MODEL = MODEL_IDS.haiku;

export const MOCK_MODE = process.env.MOCK_MODE === "1";

export function parseForceRouting(): Record<string, string> {
  const raw = process.env.FORCE_ROUTING;
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const [k, v] = pair.split("=").map((s) => s.trim());
    if (k && v) out[k.toLowerCase()] = v;
  }
  return out;
}
```

- [ ] **Step 3: Commit**

```bash
cd app && git add src/lib/types.ts src/lib/config.ts && git commit -m "feat: add domain types and config"
```

---

## Task 2: Pricing engine

**Files:**
- Create: `app/src/lib/pricing.ts`

- [ ] **Step 1: Write `src/lib/pricing.ts`**

```typescript
import type { ModelId, Tier, SubTask } from "./types";

export const MODEL_RATES: Record<ModelId, number> = {
  haiku: 0.000_001,
  sonnet: 0.000_003,
  opus: 0.000_015,
};

export const TIER_TO_MODEL: Record<Tier, ModelId> = {
  simple: "haiku",
  moderate: "sonnet",
  complex: "opus",
};

export function agentQualityScore(
  skillsCount: number,
  commits90d: number,
  successRate: number,
): number {
  const skillsScore = Math.min(skillsCount / 20, 1.0);
  const commitScore = Math.min(commits90d / 30, 1.0);
  const quality = skillsScore * 0.4 + commitScore * 0.2 + successRate * 0.4;
  return Number(quality.toFixed(3));
}

export function taskPriceEth(
  model: ModelId,
  actualTokens: number,
  agentQuality: number,
): number {
  const compute = MODEL_RATES[model] * actualTokens;
  const margin = compute * (0.1 + agentQuality * 0.4);
  return Number((compute + margin).toFixed(8));
}

export function computeSavings(subtasks: SubTask[]) {
  const naive = subtasks.reduce(
    (s, t) => s + t.actual_tokens * MODEL_RATES.opus,
    0,
  );
  const actual = subtasks.reduce(
    (s, t) => s + t.actual_tokens * MODEL_RATES[t.model],
    0,
  );
  const saved = naive - actual;
  const pct = naive > 0 ? (saved / naive) * 100 : 0;
  return {
    naive_eth: Number(naive.toFixed(8)),
    actual_eth: Number(actual.toFixed(8)),
    saved_pct: Number(pct.toFixed(1)),
  };
}

export function ethToUsd(eth: number, ethPriceUsd = 3000): number {
  return Number((eth * ethPriceUsd).toFixed(4));
}
```

- [ ] **Step 2: Manual smoke test in a scratch script** (optional but recommended)

Run one-off:
```bash
cd app && npx tsx -e "import {computeSavings, taskPriceEth, agentQualityScore} from './src/lib/pricing'; console.log(computeSavings([{model:'haiku',actual_tokens:400} as any,{model:'sonnet',actual_tokens:1200} as any,{model:'opus',actual_tokens:3000} as any])); console.log(taskPriceEth('sonnet',1200,0.85)); console.log(agentQualityScore(8,22,0.93));"
```
Expected: saved_pct ≈ 72, price non-zero, quality ≈ 0.74. Delete after verifying.

- [ ] **Step 3: Commit**

```bash
cd app && git add src/lib/pricing.ts && git commit -m "feat: add pricing engine with model rates, quality score, savings calc"
```

---

## Task 3: Fixture agents + in-memory store

**Files:**
- Create: `app/src/fixtures/agents.json`
- Create: `app/src/lib/store.ts`
- Create: `app/src/lib/seed.ts`

- [ ] **Step 1: Write `src/fixtures/agents.json`** — 8 agents spanning all tiers

```json
[
  {
    "id": "copywriter-pro",
    "name": "Copywriter Pro",
    "handle": "@copywriter-pro",
    "description": "Landing page and product copy. Brand voice adaptive.",
    "skills": ["copywriting", "landing_pages", "cta_optimization", "brand_voice", "value_props"],
    "default_tier": "moderate",
    "github_url": "https://github.com/fixtures/copywriter-pro",
    "metrics": {
      "avg_tokens_per_task": { "simple": 320, "moderate": 1100, "complex": 2400 },
      "tasks_completed": 94,
      "tasks_attempted": 100,
      "success_rate": 0.94
    },
    "skills_count": 5,
    "commits_90d": 27,
    "created_at": "2026-01-14T10:00:00Z"
  },
  {
    "id": "seo-strategist",
    "name": "SEO Strategist",
    "handle": "@seo-strategist",
    "description": "SEO briefs, keyword research, meta generation.",
    "skills": ["seo", "keyword_research", "meta_tags", "content_strategy", "serp_analysis"],
    "default_tier": "moderate",
    "github_url": "https://github.com/fixtures/seo-strategist",
    "metrics": {
      "avg_tokens_per_task": { "simple": 280, "moderate": 1400, "complex": 2600 },
      "tasks_completed": 88,
      "tasks_attempted": 100,
      "success_rate": 0.88
    },
    "skills_count": 5,
    "commits_90d": 22,
    "created_at": "2026-01-22T10:00:00Z"
  },
  {
    "id": "pricing-architect",
    "name": "Pricing Architect",
    "handle": "@pricing-architect",
    "description": "SaaS pricing design, tier modeling, unit economics.",
    "skills": ["pricing", "saas_economics", "tier_design", "revenue_modeling", "competitive_analysis", "packaging_strategy"],
    "default_tier": "complex",
    "github_url": "https://github.com/fixtures/pricing-architect",
    "metrics": {
      "avg_tokens_per_task": { "simple": 400, "moderate": 1800, "complex": 3200 },
      "tasks_completed": 91,
      "tasks_attempted": 100,
      "success_rate": 0.91
    },
    "skills_count": 6,
    "commits_90d": 18,
    "created_at": "2026-02-03T10:00:00Z"
  },
  {
    "id": "faq-formatter",
    "name": "FAQ Formatter",
    "handle": "@faq-formatter",
    "description": "Turns raw Q&A into clean, structured FAQ sections.",
    "skills": ["formatting", "markdown", "structured_output"],
    "default_tier": "simple",
    "github_url": "https://github.com/fixtures/faq-formatter",
    "metrics": {
      "avg_tokens_per_task": { "simple": 340, "moderate": 900, "complex": 1800 },
      "tasks_completed": 97,
      "tasks_attempted": 100,
      "success_rate": 0.97
    },
    "skills_count": 3,
    "commits_90d": 14,
    "created_at": "2026-02-10T10:00:00Z"
  },
  {
    "id": "social-writer",
    "name": "Social Writer",
    "handle": "@social-writer",
    "description": "Twitter threads, LinkedIn posts, viral hooks.",
    "skills": ["twitter", "linkedin", "threads", "hooks", "social_copy"],
    "default_tier": "moderate",
    "github_url": "https://github.com/fixtures/social-writer",
    "metrics": {
      "avg_tokens_per_task": { "simple": 250, "moderate": 900, "complex": 1900 },
      "tasks_completed": 85,
      "tasks_attempted": 100,
      "success_rate": 0.85
    },
    "skills_count": 5,
    "commits_90d": 31,
    "created_at": "2026-02-18T10:00:00Z"
  },
  {
    "id": "tech-architect",
    "name": "Tech Architect",
    "handle": "@tech-architect",
    "description": "System design, architecture decisions, scaling strategy.",
    "skills": ["architecture", "system_design", "scalability", "databases", "api_design", "distributed_systems", "security"],
    "default_tier": "complex",
    "github_url": "https://github.com/fixtures/tech-architect",
    "metrics": {
      "avg_tokens_per_task": { "simple": 500, "moderate": 2000, "complex": 3800 },
      "tasks_completed": 89,
      "tasks_attempted": 100,
      "success_rate": 0.89
    },
    "skills_count": 7,
    "commits_90d": 24,
    "created_at": "2026-02-25T10:00:00Z"
  },
  {
    "id": "translator",
    "name": "Translator",
    "handle": "@translator",
    "description": "Fast accurate translations. EN/ES/PT/FR/DE.",
    "skills": ["translation", "localization", "language_detection"],
    "default_tier": "simple",
    "github_url": "https://github.com/fixtures/translator",
    "metrics": {
      "avg_tokens_per_task": { "simple": 220, "moderate": 700, "complex": 1500 },
      "tasks_completed": 96,
      "tasks_attempted": 100,
      "success_rate": 0.96
    },
    "skills_count": 3,
    "commits_90d": 12,
    "created_at": "2026-03-04T10:00:00Z"
  },
  {
    "id": "data-analyst",
    "name": "Data Analyst",
    "handle": "@data-analyst",
    "description": "Summarizes, analyzes, charts raw data tables.",
    "skills": ["data_analysis", "summarization", "statistics", "charting"],
    "default_tier": "moderate",
    "github_url": "https://github.com/fixtures/data-analyst",
    "metrics": {
      "avg_tokens_per_task": { "simple": 300, "moderate": 1300, "complex": 2700 },
      "tasks_completed": 90,
      "tasks_attempted": 100,
      "success_rate": 0.90
    },
    "skills_count": 4,
    "commits_90d": 19,
    "created_at": "2026-03-11T10:00:00Z"
  }
]
```

- [ ] **Step 2: Write `src/lib/store.ts`** — in-memory singleton

```typescript
import type { Agent, OrchestrationRun } from "./types";

type Store = {
  agents: Map<string, Agent>;
  runs: Map<string, OrchestrationRun>;
  seeded: boolean;
};

const g = globalThis as unknown as { __nomos_store?: Store };

export function getStore(): Store {
  if (!g.__nomos_store) {
    g.__nomos_store = {
      agents: new Map(),
      runs: new Map(),
      seeded: false,
    };
  }
  return g.__nomos_store;
}

export function upsertAgent(agent: Agent): Agent {
  const store = getStore();
  store.agents.set(agent.id, agent);
  return agent;
}

export function listAgents(): Agent[] {
  return Array.from(getStore().agents.values()).sort(
    (a, b) => b.quality - a.quality,
  );
}

export function getAgent(id: string): Agent | undefined {
  return getStore().agents.get(id);
}

export function saveRun(run: OrchestrationRun): OrchestrationRun {
  getStore().runs.set(run.id, run);
  return run;
}

export function getRun(id: string): OrchestrationRun | undefined {
  return getStore().runs.get(id);
}
```

- [ ] **Step 3: Write `src/lib/seed.ts`** — hydrate store from fixtures

```typescript
import fixturesData from "@/fixtures/agents.json";
import type { Agent } from "./types";
import { agentQualityScore } from "./pricing";
import { getStore, upsertAgent } from "./store";

interface RawAgent extends Omit<Agent, "quality"> {}

export function ensureSeeded(): void {
  const store = getStore();
  if (store.seeded) return;
  for (const raw of fixturesData as RawAgent[]) {
    const quality = agentQualityScore(
      raw.skills_count,
      raw.commits_90d,
      raw.metrics.success_rate,
    );
    upsertAgent({ ...raw, quality });
  }
  store.seeded = true;
}
```

- [ ] **Step 4: Enable JSON imports** — verify `tsconfig.json` has `"resolveJsonModule": true` (Next.js default) and `"moduleResolution": "bundler"`. If missing, add them.

- [ ] **Step 5: Commit**

```bash
cd app && git add src/fixtures/agents.json src/lib/store.ts src/lib/seed.ts && git commit -m "feat: add 8 fixture agents and in-memory store with seeding"
```

---

## Task 4: Anthropic client + classifier

**Files:**
- Create: `app/src/lib/anthropic.ts`
- Create: `app/src/lib/classifier.ts`

- [ ] **Step 1: Write `src/lib/anthropic.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}
```

- [ ] **Step 2: Write `src/lib/classifier.ts`**

```typescript
import { getAnthropic } from "./anthropic";
import { CLASSIFIER_MODEL, parseForceRouting } from "./config";
import type { Classification, Tier } from "./types";

const SYSTEM_PROMPT = `You are a task complexity classifier. Given a subtask description, output JSON only:
{"tier": "simple" | "moderate" | "complex", "reason": "one sentence", "estimated_tokens": <integer>}

Rules:
- simple: formatting, extraction, translation, yes/no decisions (<500 tokens)
- moderate: writing, summarization, code generation, analysis (500-2000 tokens)
- complex: multi-step reasoning, architecture, strategy, evaluation (>2000 tokens)

Output VALID JSON only, no prose, no code fences.`;

function keyword(s: string): string | undefined {
  const lower = s.toLowerCase();
  if (/pricing|architect|strategy|design\s+the/.test(lower)) return "pricing";
  if (/landing|copy|headline|hero/.test(lower)) return "landing";
  if (/faq|format|bullet|structure/.test(lower)) return "faq";
  return undefined;
}

function applyForceRouting(description: string, base: Classification): Classification {
  const overrides = parseForceRouting();
  const k = keyword(description);
  if (k && overrides[k]) {
    const tier = overrides[k] as Tier;
    return { ...base, tier, reason: `[forced] ${base.reason}` };
  }
  return base;
}

export async function classify(description: string): Promise<Classification> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Subtask: ${description}` }],
  });
  const text = res.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  let parsed: Classification;
  try {
    parsed = JSON.parse(text) as Classification;
    if (!["simple", "moderate", "complex"].includes(parsed.tier)) {
      throw new Error(`invalid tier: ${parsed.tier}`);
    }
  } catch {
    parsed = {
      tier: "moderate",
      reason: "classifier output unparseable, defaulting to moderate",
      estimated_tokens: 1000,
    };
  }
  return applyForceRouting(description, parsed);
}
```

- [ ] **Step 3: Commit**

```bash
cd app && git add src/lib/anthropic.ts src/lib/classifier.ts && git commit -m "feat: add Anthropic client and Haiku complexity classifier"
```

---

## Task 5: Agent selection router

**Files:**
- Create: `app/src/lib/router.ts`

- [ ] **Step 1: Write `src/lib/router.ts`**

```typescript
import type { Agent, ModelId, Tier } from "./types";
import { TIER_TO_MODEL } from "./pricing";

export function tierToModel(tier: Tier): ModelId {
  return TIER_TO_MODEL[tier];
}

export function selectAgent(
  agents: Agent[],
  tier: Tier,
  hint?: string,
): Agent {
  if (agents.length === 0) throw new Error("no agents available");
  const hintLower = hint?.toLowerCase() ?? "";
  const scored = agents.map((a) => {
    const tierMatch = a.default_tier === tier ? 2 : 0;
    const skillMatch = hintLower
      ? a.skills.reduce(
          (n, s) => n + (hintLower.includes(s.replace(/_/g, " ")) ? 1 : 0),
          0,
        )
      : 0;
    const avgTokens = a.metrics.avg_tokens_per_task[tier] ?? 2000;
    const efficiency = Math.max(0, 1 - avgTokens / 4000);
    const score = tierMatch + skillMatch + efficiency + a.quality;
    return { agent: a, score };
  });
  scored.sort((x, y) => y.score - x.score);
  return scored[0].agent;
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/lib/router.ts && git commit -m "feat: add agent selection router with tier+skill+efficiency scoring"
```

---

## Task 6: Orchestrator (Sonnet tool_use decomposer)

**Files:**
- Create: `app/src/lib/orchestrator.ts`

- [ ] **Step 1: Write `src/lib/orchestrator.ts`**

```typescript
import { getAnthropic } from "./anthropic";
import { ORCHESTRATOR_MODEL } from "./config";

interface DecomposedSubtask {
  description: string;
  skill_hint: string;
}

const ORCHESTRATOR_SYSTEM = `You are an orchestrator. Given a product/work goal, decompose it into 3 to 5 well-scoped subtasks that can each be delegated to a specialized agent. Subtasks must be independent, produce distinct outputs, and span different complexity levels when possible (simple formatting, moderate writing, complex strategy).

You MUST call the "submit_subtasks" tool exactly once with your decomposition. Do not reply with prose.`;

const TOOL = {
  name: "submit_subtasks",
  description: "Submit the decomposed subtasks for the goal",
  input_schema: {
    type: "object" as const,
    properties: {
      subtasks: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description:
                "Imperative subtask description (e.g., 'Design the pricing tier structure for the SaaS product')",
            },
            skill_hint: {
              type: "string",
              description:
                "Short tag matching an expected agent skill (e.g., 'pricing', 'copywriting', 'formatting')",
            },
          },
          required: ["description", "skill_hint"],
        },
      },
    },
    required: ["subtasks"],
  },
};

export async function decompose(goal: string): Promise<DecomposedSubtask[]> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: ORCHESTRATOR_MODEL,
    max_tokens: 1024,
    system: ORCHESTRATOR_SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "submit_subtasks" },
    messages: [{ role: "user", content: `Goal: ${goal}` }],
  });
  const toolUse = res.content.find(
    (c): c is { type: "tool_use"; id: string; name: string; input: unknown } =>
      c.type === "tool_use",
  );
  if (!toolUse) throw new Error("orchestrator did not call submit_subtasks");
  const input = toolUse.input as { subtasks: DecomposedSubtask[] };
  if (!input.subtasks || input.subtasks.length < 3) {
    throw new Error("orchestrator returned fewer than 3 subtasks");
  }
  return input.subtasks;
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/lib/orchestrator.ts && git commit -m "feat: add Sonnet orchestrator with tool_use goal decomposition"
```

---

## Task 7: Subagent executor

**Files:**
- Create: `app/src/lib/executor.ts`

- [ ] **Step 1: Write `src/lib/executor.ts`**

```typescript
import { getAnthropic } from "./anthropic";
import { MODEL_IDS } from "./config";
import type { Agent, ModelId } from "./types";

function buildSubagentSystem(agent: Agent, tier: string): string {
  return `You are ${agent.name} (${agent.handle}). ${agent.description}

Your skills: ${agent.skills.join(", ")}.
You are operating at the "${tier}" complexity tier. Be concise, direct, and stay strictly within your skill boundary. Produce exactly one deliverable — no preamble, no meta-commentary. Target length: short to medium.`;
}

export interface ExecutionResult {
  output: string;
  input_tokens: number;
  output_tokens: number;
  actual_tokens: number;
}

const MAX_OUTPUT_TOKENS: Record<ModelId, number> = {
  haiku: 512,
  sonnet: 1024,
  opus: 2048,
};

export async function runSubagent(
  agent: Agent,
  model: ModelId,
  tier: string,
  taskDescription: string,
): Promise<ExecutionResult> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: MODEL_IDS[model],
    max_tokens: MAX_OUTPUT_TOKENS[model],
    system: buildSubagentSystem(agent, tier),
    messages: [{ role: "user", content: taskDescription }],
  });
  const output = res.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  const input_tokens = res.usage.input_tokens;
  const output_tokens = res.usage.output_tokens;
  return {
    output,
    input_tokens,
    output_tokens,
    actual_tokens: input_tokens + output_tokens,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/lib/executor.ts && git commit -m "feat: add subagent executor that runs a task on its routed model"
```

---

## Task 8: GitHub registration helpers

**Files:**
- Create: `app/src/lib/github.ts`

- [ ] **Step 1: Write `src/lib/github.ts`**

```typescript
import type { Agent, AgentMetrics } from "./types";
import { agentQualityScore } from "./pricing";

function gh(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return fetch(`https://api.github.com${path}`, { headers });
}

function parseGithubUrl(url: string): { owner: string; repo: string } {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!m) throw new Error(`invalid GitHub URL: ${url}`);
  return { owner: m[1], repo: m[2] };
}

async function fetchFile(
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  const r = await gh(`/repos/${owner}/${repo}/contents/${path}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { content: string; encoding: string };
  if (j.encoding !== "base64") return null;
  return Buffer.from(j.content, "base64").toString("utf-8");
}

async function commitsLast90d(owner: string, repo: string): Promise<number> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const r = await gh(
    `/repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}&per_page=100`,
  );
  if (!r.ok) return 0;
  const arr = (await r.json()) as unknown[];
  return Array.isArray(arr) ? arr.length : 0;
}

function parseSkills(md: string): string[] {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^[-*]\s+([a-zA-Z0-9_\- ]{2,40})\s*$/);
    if (m) out.push(m[1].trim().toLowerCase().replace(/\s+/g, "_"));
  }
  return out.slice(0, 20);
}

export async function registerFromGithub(url: string): Promise<Agent> {
  const { owner, repo } = parseGithubUrl(url);
  const [skillsMd, metricsJson, commits90d] = await Promise.all([
    fetchFile(owner, repo, "skills.md"),
    fetchFile(owner, repo, "memory/metrics.json"),
    commitsLast90d(owner, repo),
  ]);

  const skills =
    skillsMd && parseSkills(skillsMd).length > 0
      ? parseSkills(skillsMd)
      : ["general"];
  const metrics: AgentMetrics = metricsJson
    ? (JSON.parse(metricsJson) as AgentMetrics)
    : {
        avg_tokens_per_task: { simple: 400, moderate: 1200, complex: 2800 },
        tasks_completed: 0,
        tasks_attempted: 0,
        success_rate: 0.75,
      };

  const skills_count = skills.length;
  const quality = agentQualityScore(
    skills_count,
    commits90d,
    metrics.success_rate,
  );

  return {
    id: `${owner}-${repo}`.toLowerCase(),
    name: repo.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    handle: `@${owner}/${repo}`,
    description: `Registered from github.com/${owner}/${repo}`,
    skills,
    default_tier: "moderate",
    github_url: `https://github.com/${owner}/${repo}`,
    metrics,
    skills_count,
    commits_90d: commits90d,
    quality,
    created_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/lib/github.ts && git commit -m "feat: add GitHub registration fetcher with skills/metrics/commits"
```

---

## Task 9: API route — GET /api/agents, GET /api/agents/[id]

**Files:**
- Create: `app/src/app/api/agents/route.ts`
- Create: `app/src/app/api/agents/[id]/route.ts`

- [ ] **Step 1: Write `src/app/api/agents/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";
import { listAgents } from "@/lib/store";

export async function GET() {
  ensureSeeded();
  return NextResponse.json({ success: true, data: listAgents() });
}
```

- [ ] **Step 2: Write `src/app/api/agents/[id]/route.ts`** — Next.js 16 async params

```typescript
import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";
import { getAgent } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureSeeded();
  const { id } = await params;
  const agent = getAgent(id);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: { message: "agent not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: agent });
}
```

- [ ] **Step 3: Local smoke** — `pnpm dev`, open `http://localhost:3000/api/agents`. Expect `{ success: true, data: [...8 agents sorted by quality desc] }`.

- [ ] **Step 4: Commit**

```bash
cd app && git add src/app/api/agents && git commit -m "feat: add /api/agents list and detail routes"
```

---

## Task 10: API route — POST /api/classify

**Files:**
- Create: `app/src/app/api/classify/route.ts`

- [ ] **Step 1: Write `src/app/api/classify/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { classify } from "@/lib/classifier";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json()) as { description?: string };
  if (!body.description) {
    return NextResponse.json(
      { success: false, error: { message: "description required" } },
      { status: 400 },
    );
  }
  try {
    const classification = await classify(body.description);
    return NextResponse.json({ success: true, data: classification });
  } catch (e) {
    const message = e instanceof Error ? e.message : "classify failed";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Smoke test** — `curl -X POST http://localhost:3000/api/classify -H 'content-type: application/json' -d '{"description":"Format the raw FAQ text into a markdown table"}'`. Expect `tier: "simple"`.

- [ ] **Step 3: Commit**

```bash
cd app && git add src/app/api/classify && git commit -m "feat: add /api/classify endpoint"
```

---

## Task 11: API route — POST /api/register

**Files:**
- Create: `app/src/app/api/register/route.ts`

- [ ] **Step 1: Write `src/app/api/register/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { registerFromGithub } from "@/lib/github";
import { ensureSeeded } from "@/lib/seed";
import { upsertAgent } from "@/lib/store";
import { MOCK_MODE } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  ensureSeeded();
  if (MOCK_MODE) {
    return NextResponse.json(
      { success: false, error: { message: "registration disabled in MOCK_MODE" } },
      { status: 403 },
    );
  }
  const body = (await req.json()) as { github_url?: string };
  if (!body.github_url) {
    return NextResponse.json(
      { success: false, error: { message: "github_url required" } },
      { status: 400 },
    );
  }
  try {
    const agent = await registerFromGithub(body.github_url);
    upsertAgent(agent);
    return NextResponse.json({ success: true, data: agent });
  } catch (e) {
    const message = e instanceof Error ? e.message : "register failed";
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/app/api/register && git commit -m "feat: add /api/register endpoint for GitHub-based agent registration"
```

---

## Task 12: API route — POST /api/orchestrate (SSE stream)

**Files:**
- Create: `app/src/app/api/orchestrate/route.ts`

- [ ] **Step 1: Write `src/app/api/orchestrate/route.ts`**

```typescript
import { ensureSeeded } from "@/lib/seed";
import { listAgents, saveRun } from "@/lib/store";
import { decompose } from "@/lib/orchestrator";
import { classify } from "@/lib/classifier";
import { selectAgent, tierToModel } from "@/lib/router";
import { runSubagent } from "@/lib/executor";
import { computeSavings, taskPriceEth, MODEL_RATES } from "@/lib/pricing";
import type { OrchestrationEvent, OrchestrationRun, SubTask } from "@/lib/types";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 120;

function sse(event: OrchestrationEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: Request) {
  ensureSeeded();
  const { goal } = (await req.json()) as { goal?: string };
  if (!goal) {
    return new Response(
      JSON.stringify({ success: false, error: { message: "goal required" } }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (ev: OrchestrationEvent) =>
        controller.enqueue(enc.encode(sse(ev)));

      try {
        const agents = listAgents();
        const run: OrchestrationRun = {
          id: uuid(),
          goal,
          created_at: new Date().toISOString(),
          subtasks: [],
          total_actual_eth: 0,
          total_naive_eth: 0,
          saved_pct: 0,
          status: "decomposing",
        };
        send({ type: "run_created", run });

        const decomposed = await decompose(goal);
        const subtasks: SubTask[] = decomposed.map((d) => ({
          id: uuid(),
          description: d.description,
          tier: "moderate",
          model: "sonnet",
          agent_id: "",
          status: "pending",
          actual_tokens: 0,
          cost_eth: 0,
        }));
        run.subtasks = subtasks;
        send({ type: "decomposed", subtasks });

        // classify + assign each
        for (let i = 0; i < subtasks.length; i++) {
          const st = subtasks[i];
          const classification = await classify(st.description);
          st.classification = classification;
          st.tier = classification.tier;
          st.model = tierToModel(classification.tier);
          st.status = "routed";
          send({
            type: "classified",
            subtask_id: st.id,
            classification,
            model: st.model,
          });

          const agent = selectAgent(agents, st.tier, decomposed[i].skill_hint);
          st.agent_id = agent.id;
          send({ type: "agent_assigned", subtask_id: st.id, agent_id: agent.id });
        }

        // execute in parallel
        await Promise.all(
          subtasks.map(async (st) => {
            send({ type: "task_started", subtask_id: st.id });
            st.status = "working";
            const agent = agents.find((a) => a.id === st.agent_id);
            if (!agent) throw new Error(`agent ${st.agent_id} not found`);
            try {
              const result = await runSubagent(
                agent,
                st.model,
                st.tier,
                st.description,
              );
              st.actual_tokens = result.actual_tokens;
              st.cost_eth = taskPriceEth(
                st.model,
                result.actual_tokens,
                agent.quality,
              );
              st.output = result.output;
              st.status = "done";
              send({
                type: "task_completed",
                subtask_id: st.id,
                actual_tokens: result.actual_tokens,
                cost_eth: st.cost_eth,
                output: result.output,
              });
            } catch (e) {
              st.status = "error";
              st.error = e instanceof Error ? e.message : "task failed";
              send({
                type: "task_failed",
                subtask_id: st.id,
                error: st.error,
              });
            }
          }),
        );

        const totals = computeSavings(subtasks);
        run.total_actual_eth = totals.actual_eth;
        run.total_naive_eth = totals.naive_eth;
        run.saved_pct = totals.saved_pct;
        run.status = "done";
        saveRun(run);

        send({
          type: "run_completed",
          total_actual_eth: totals.actual_eth,
          total_naive_eth: totals.naive_eth,
          saved_pct: totals.saved_pct,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "orchestrate failed";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

// expose helper — unused here but avoids unused-import warning for constants
export const _rates = MODEL_RATES;
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/app/api/orchestrate && git commit -m "feat: add /api/orchestrate SSE endpoint streaming live orchestration events"
```

---

## Task 13: UI foundation — globals, layout, Nav

**Files:**
- Modify: `app/src/app/globals.css`
- Modify: `app/src/app/layout.tsx`
- Create: `app/src/components/Nav.tsx`

- [ ] **Step 1: Rewrite `src/app/globals.css`** — tier tokens + dark theme base

```css
@import "tailwindcss";

:root {
  --bg: #0a0a0f;
  --bg-elev: #14141c;
  --bg-elev2: #1c1c28;
  --border: #2a2a38;
  --text: #e8e8f0;
  --text-dim: #8a8aa0;
  --accent: #7c3aed;
  --tier-haiku: #22c55e;
  --tier-sonnet: #3b82f6;
  --tier-opus: #a855f7;
  --savings: #f59e0b;
}

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  min-height: 100vh;
}

.tier-haiku { color: var(--tier-haiku); }
.tier-sonnet { color: var(--tier-sonnet); }
.tier-opus { color: var(--tier-opus); }
.bg-tier-haiku { background-color: color-mix(in srgb, var(--tier-haiku) 18%, transparent); border-color: var(--tier-haiku); }
.bg-tier-sonnet { background-color: color-mix(in srgb, var(--tier-sonnet) 18%, transparent); border-color: var(--tier-sonnet); }
.bg-tier-opus { background-color: color-mix(in srgb, var(--tier-opus) 18%, transparent); border-color: var(--tier-opus); }

.card {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 14px;
}
.card-hover:hover {
  border-color: var(--accent);
  transition: border-color 0.15s ease;
}
```

- [ ] **Step 2: Write `src/components/Nav.tsx`**

```tsx
import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center gap-6">
      <Link href="/" className="font-bold text-lg tracking-tight">
        ⟐ <span className="text-[var(--accent)]">Nomos</span>
      </Link>
      <div className="flex gap-5 text-sm text-[var(--text-dim)]">
        <Link href="/" className="hover:text-white">Marketplace</Link>
        <Link href="/orchestrate" className="hover:text-white">Orchestrate</Link>
        <Link href="/register" className="hover:text-white">Register agent</Link>
      </div>
      <div className="ml-auto text-xs text-[var(--text-dim)]">
        compute-routed · demo build
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Nomos — Compute-Routed Agent Marketplace",
  description:
    "Orchestrators that decompose goals, classify complexity, and route each subtask to the cheapest Claude model that can do it well.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd app && git add src/app/globals.css src/app/layout.tsx src/components/Nav.tsx && git commit -m "feat: add dark theme, tier color tokens, and nav"
```

---

## Task 14: TierBadge + AgentCard components

**Files:**
- Create: `app/src/components/TierBadge.tsx`
- Create: `app/src/components/AgentCard.tsx`

- [ ] **Step 1: Write `src/components/TierBadge.tsx`**

```tsx
import type { Tier, ModelId } from "@/lib/types";

const LABEL: Record<ModelId, string> = {
  haiku: "HAIKU",
  sonnet: "SONNET",
  opus: "OPUS",
};

const TIER_TO_MODEL: Record<Tier, ModelId> = {
  simple: "haiku",
  moderate: "sonnet",
  complex: "opus",
};

export function TierBadge({ tier, model, size = "sm" }: { tier?: Tier; model?: ModelId; size?: "sm" | "md" }) {
  const m: ModelId = model ?? (tier ? TIER_TO_MODEL[tier] : "sonnet");
  const sz = size === "md" ? "text-xs px-3 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={`inline-block rounded-full font-mono font-bold uppercase border bg-tier-${m} tier-${m} ${sz}`}
    >
      {LABEL[m]}
    </span>
  );
}
```

- [ ] **Step 2: Write `src/components/AgentCard.tsx`**

```tsx
import Link from "next/link";
import type { Agent } from "@/lib/types";
import { TierBadge } from "./TierBadge";

export function AgentCard({ agent }: { agent: Agent }) {
  const moderateAvg =
    agent.metrics.avg_tokens_per_task[agent.default_tier] ?? 1000;
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="card card-hover p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{agent.name}</div>
          <div className="text-xs text-[var(--text-dim)]">{agent.handle}</div>
        </div>
        <TierBadge tier={agent.default_tier} />
      </div>
      <p className="text-sm text-[var(--text-dim)] line-clamp-2">
        {agent.description}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {agent.skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="text-[10px] bg-[var(--bg-elev2)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-dim)]"
          >
            {s.replace(/_/g, " ")}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--border)] text-xs">
        <div>
          <div className="text-[var(--text-dim)]">Avg tokens</div>
          <div className="font-mono text-sm">{moderateAvg.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[var(--text-dim)]">Success</div>
          <div className="font-mono text-sm">
            {(agent.metrics.success_rate * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-[var(--text-dim)]">Quality</div>
          <div className="font-mono text-sm">{agent.quality.toFixed(2)}</div>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd app && git add src/components/TierBadge.tsx src/components/AgentCard.tsx && git commit -m "feat: add TierBadge and AgentCard components"
```

---

## Task 15: Marketplace page (/)

**Files:**
- Replace: `app/src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import { AgentCard } from "@/components/AgentCard";
import { ensureSeeded } from "@/lib/seed";
import { listAgents } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function MarketplacePage() {
  ensureSeeded();
  const agents = listAgents();
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Marketplace of agents
        </h1>
        <p className="text-[var(--text-dim)] max-w-2xl">
          Each agent advertises what they&rsquo;re optimized for, what model tier they run on,
          and how token-efficient they are. Orchestrators route subtasks to the cheapest
          model that can still do the work.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/app/page.tsx && git commit -m "feat: add marketplace feed page"
```

---

## Task 16: SavingsPanel + TaskRow + TeamHeader components

**Files:**
- Create: `app/src/components/SavingsPanel.tsx`
- Create: `app/src/components/TaskRow.tsx`
- Create: `app/src/components/TeamHeader.tsx`

- [ ] **Step 1: Write `src/components/SavingsPanel.tsx`**

```tsx
export function SavingsPanel({
  naive,
  actual,
  savedPct,
  live,
}: {
  naive: number;
  actual: number;
  savedPct: number;
  live: boolean;
}) {
  const fmt = (n: number) => n.toFixed(6);
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
          Compute savings
        </div>
        {live && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <span className="w-2 h-2 rounded-full bg-[var(--savings)] animate-pulse" />
            routing live
          </div>
        )}
      </div>
      <div className="flex items-end gap-6">
        <div>
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Naive (all-Opus)</div>
          <div className="font-mono text-xl line-through text-[var(--text-dim)]">
            {fmt(naive)} ETH
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Routed actual</div>
          <div className="font-mono text-xl">{fmt(actual)} ETH</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase text-[var(--savings)]">Saved</div>
          <div className="font-mono text-4xl font-bold text-[var(--savings)]">
            {savedPct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/TaskRow.tsx`**

```tsx
import { TierBadge } from "./TierBadge";
import type { SubTask, Agent } from "@/lib/types";

const STATUS_LABEL: Record<SubTask["status"], string> = {
  pending: "QUEUED",
  classifying: "CLASSIFYING",
  routed: "READY",
  working: "WORKING",
  done: "DONE",
  error: "ERROR",
};

export function TaskRow({
  task,
  agent,
}: {
  task: SubTask;
  agent?: Agent;
}) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm">{task.description}</div>
          {agent && (
            <div className="text-xs text-[var(--text-dim)] mt-1">
              Assigned to {agent.handle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.status !== "pending" && task.status !== "classifying" && (
            <TierBadge model={task.model} />
          )}
          <span
            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
              task.status === "done"
                ? "bg-green-500/15 text-green-400"
                : task.status === "error"
                ? "bg-red-500/15 text-red-400"
                : task.status === "working"
                ? "bg-yellow-500/15 text-yellow-400"
                : "bg-[var(--bg-elev2)] text-[var(--text-dim)]"
            }`}
          >
            {STATUS_LABEL[task.status]}
          </span>
        </div>
      </div>
      {task.classification && (
        <div className="text-xs text-[var(--text-dim)] italic">
          Classifier: {task.classification.reason}
        </div>
      )}
      {task.status === "done" && (
        <div className="grid grid-cols-2 gap-3 text-xs border-t border-[var(--border)] pt-3">
          <div>
            <span className="text-[var(--text-dim)]">Tokens: </span>
            <span className="font-mono">{task.actual_tokens.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <span className="text-[var(--text-dim)]">Cost: </span>
            <span className="font-mono">{task.cost_eth.toFixed(6)} ETH</span>
          </div>
        </div>
      )}
      {task.status === "done" && task.output && (
        <details className="text-xs">
          <summary className="cursor-pointer text-[var(--text-dim)] hover:text-white">
            View output
          </summary>
          <pre className="mt-2 whitespace-pre-wrap bg-[var(--bg-elev2)] p-3 rounded text-[var(--text)]">
            {task.output}
          </pre>
        </details>
      )}
      {task.error && (
        <div className="text-xs text-red-400">Error: {task.error}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/TeamHeader.tsx`**

```tsx
import type { Agent, SubTask } from "@/lib/types";

export function TeamHeader({
  subtasks,
  agentsById,
}: {
  subtasks: SubTask[];
  agentsById: Map<string, Agent>;
}) {
  const hired = subtasks
    .map((st) => agentsById.get(st.agent_id))
    .filter((a): a is Agent => !!a);
  const unique = Array.from(new Map(hired.map((a) => [a.id, a])).values());
  if (unique.length === 0) return null;
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="text-xs uppercase text-[var(--text-dim)]">
        Team assembled
      </div>
      <div className="flex -space-x-2">
        {unique.map((a) => (
          <div
            key={a.id}
            title={a.name}
            className="w-8 h-8 rounded-full bg-[var(--bg-elev2)] border border-[var(--border)] flex items-center justify-center text-xs font-bold"
          >
            {a.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>
      <div className="text-sm font-mono">{unique.length} agents</div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd app && git add src/components/SavingsPanel.tsx src/components/TaskRow.tsx src/components/TeamHeader.tsx && git commit -m "feat: add SavingsPanel, TaskRow, TeamHeader components"
```

---

## Task 17: Orchestration dashboard page (/orchestrate)

**Files:**
- Create: `app/src/app/orchestrate/page.tsx`

- [ ] **Step 1: Write `src/app/orchestrate/page.tsx`** — client component with SSE consumption

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { SavingsPanel } from "@/components/SavingsPanel";
import { TaskRow } from "@/components/TaskRow";
import { TeamHeader } from "@/components/TeamHeader";
import type { Agent, OrchestrationEvent, SubTask } from "@/lib/types";

const DEFAULT_GOAL =
  "Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes: 'How much? Monthly. Cancel anytime. Who owns data? Customer does. Refunds? 30-day. Enterprise? Yes.'";

export default function OrchestratePage() {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [totals, setTotals] = useState({
    naive: 0,
    actual: 0,
    savedPct: 0,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((j) => setAgents(j.data ?? []));
  }, []);

  const agentsById = useMemo(
    () => new Map(agents.map((a) => [a.id, a])),
    [agents],
  );

  async function run() {
    setSubtasks([]);
    setTotals({ naive: 0, actual: 0, savedPct: 0 });
    setRunning(true);
    setFinished(false);
    setError(null);

    const res = await fetch("/api/orchestrate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    if (!res.ok || !res.body) {
      setError("orchestrate request failed");
      setRunning(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        const json = line.replace(/^data:\s*/, "");
        const ev = JSON.parse(json) as OrchestrationEvent;
        setSubtasks((prev) => applyEvent(prev, ev));
        if (ev.type === "run_completed") {
          setTotals({
            naive: ev.total_naive_eth,
            actual: ev.total_actual_eth,
            savedPct: ev.saved_pct,
          });
          setFinished(true);
        } else if (ev.type === "error") {
          setError(ev.message);
        }
      }
    }
    setRunning(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Orchestrate</h1>
        <p className="text-[var(--text-dim)] max-w-2xl">
          Give the orchestrator a goal. It will decompose it into subtasks,
          classify each by complexity, route to the cheapest Claude model that
          can do it well, and hire an agent from the marketplace.
        </p>
      </header>

      <div className="card p-4 flex flex-col gap-3">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={4}
          className="w-full bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm font-mono resize-none focus:outline-none focus:border-[var(--accent)]"
          placeholder="Describe your goal..."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={running || !goal.trim()}
            className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 px-5 py-2 rounded text-sm font-semibold"
          >
            {running ? "Running..." : "Run orchestrator"}
          </button>
          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>
      </div>

      {subtasks.length > 0 && (
        <SavingsPanel
          naive={totals.naive}
          actual={totals.actual}
          savedPct={totals.savedPct}
          live={running && !finished}
        />
      )}

      {subtasks.length > 0 && (
        <TeamHeader subtasks={subtasks} agentsById={agentsById} />
      )}

      <div className="flex flex-col gap-3">
        {subtasks.map((st) => (
          <TaskRow key={st.id} task={st} agent={agentsById.get(st.agent_id)} />
        ))}
      </div>
    </div>
  );
}

function applyEvent(prev: SubTask[], ev: OrchestrationEvent): SubTask[] {
  switch (ev.type) {
    case "decomposed":
      return ev.subtasks;
    case "classified":
      return prev.map((st) =>
        st.id === ev.subtask_id
          ? {
              ...st,
              classification: ev.classification,
              tier: ev.classification.tier,
              model: ev.model,
              status: "routed",
            }
          : st,
      );
    case "agent_assigned":
      return prev.map((st) =>
        st.id === ev.subtask_id ? { ...st, agent_id: ev.agent_id } : st,
      );
    case "task_started":
      return prev.map((st) =>
        st.id === ev.subtask_id ? { ...st, status: "working" } : st,
      );
    case "task_completed":
      return prev.map((st) =>
        st.id === ev.subtask_id
          ? {
              ...st,
              status: "done",
              actual_tokens: ev.actual_tokens,
              cost_eth: ev.cost_eth,
              output: ev.output,
            }
          : st,
      );
    case "task_failed":
      return prev.map((st) =>
        st.id === ev.subtask_id ? { ...st, status: "error", error: ev.error } : st,
      );
    default:
      return prev;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/app/orchestrate && git commit -m "feat: add orchestrate dashboard with SSE-driven live task list and savings panel"
```

---

## Task 18: Agent detail page

**Files:**
- Create: `app/src/app/agents/[id]/page.tsx`

- [ ] **Step 1: Write `src/app/agents/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { TierBadge } from "@/components/TierBadge";
import { ensureSeeded } from "@/lib/seed";
import { getAgent } from "@/lib/store";
import { MODEL_RATES, taskPriceEth } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AgentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  ensureSeeded();
  const { id } = await params;
  const agent = getAgent(id);
  if (!agent) notFound();

  const tiers: Array<"simple" | "moderate" | "complex"> = [
    "simple",
    "moderate",
    "complex",
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="text-sm text-[var(--text-dim)] hover:text-white">
        ← back to marketplace
      </Link>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <div className="text-sm text-[var(--text-dim)]">{agent.handle}</div>
          {agent.github_url && (
            <a
              href={agent.github_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--accent)] hover:underline"
            >
              {agent.github_url}
            </a>
          )}
        </div>
        <TierBadge tier={agent.default_tier} size="md" />
      </header>

      <p className="text-[var(--text-dim)]">{agent.description}</p>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
          Skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {agent.skills.map((s) => (
            <span
              key={s}
              className="text-xs bg-[var(--bg-elev2)] border border-[var(--border)] rounded px-2 py-1"
            >
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const avg = agent.metrics.avg_tokens_per_task[tier];
          if (!avg) return null;
          const model = tier === "simple" ? "haiku" : tier === "moderate" ? "sonnet" : "opus";
          const price = taskPriceEth(model, avg, agent.quality);
          return (
            <div key={tier} className="card p-4 flex flex-col gap-2">
              <TierBadge tier={tier} />
              <div className="text-xs text-[var(--text-dim)]">Avg tokens</div>
              <div className="font-mono text-lg">{avg.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-dim)] pt-2 border-t border-[var(--border)]">
                Est. price / task
              </div>
              <div className="font-mono text-sm">{price.toFixed(6)} ETH</div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-[var(--text-dim)]">Success rate</div>
          <div className="font-mono text-2xl">
            {(agent.metrics.success_rate * 100).toFixed(0)}%
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--text-dim)]">Commits 90d</div>
          <div className="font-mono text-2xl">{agent.commits_90d}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--text-dim)]">Quality score</div>
          <div className="font-mono text-2xl">{agent.quality.toFixed(2)}</div>
        </div>
      </section>

      <section className="text-xs text-[var(--text-dim)] border-t border-[var(--border)] pt-4">
        Base rates — Haiku {MODEL_RATES.haiku.toFixed(8)} ETH/token · Sonnet{" "}
        {MODEL_RATES.sonnet.toFixed(8)} ETH/token · Opus{" "}
        {MODEL_RATES.opus.toFixed(8)} ETH/token
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/app/agents && git commit -m "feat: add agent detail page with per-tier metrics and pricing"
```

---

## Task 19: Register page

**Files:**
- Create: `app/src/app/register/page.tsx`

- [ ] **Step 1: Write `src/app/register/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Agent } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const [url, setUrl] = useState("https://github.com/");
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAgent(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ github_url: url }),
    });
    const j = (await res.json()) as { success: boolean; data?: Agent; error?: { message: string } };
    setLoading(false);
    if (!j.success) {
      setError(j.error?.message ?? "unknown error");
      return;
    }
    setAgent(j.data!);
    setTimeout(() => router.push(`/agents/${j.data!.id}`), 1500);
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <header>
        <h1 className="text-3xl font-bold">Register an agent</h1>
        <p className="text-[var(--text-dim)]">
          Point to a GitHub repo. We&rsquo;ll read <code>skills.md</code>,{" "}
          <code>memory/metrics.json</code>, and the last 90 days of commits to
          score the agent and price it.
        </p>
      </header>
      <form onSubmit={submit} className="card p-4 flex flex-col gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="bg-[var(--bg-elev2)] border border-[var(--border)] rounded p-3 text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
          placeholder="https://github.com/owner/repo"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 px-5 py-2 rounded text-sm font-semibold self-start"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
      {error && <div className="text-sm text-red-400">{error}</div>}
      {agent && (
        <div className="card p-4 bg-green-500/5 border-green-500/40">
          <div className="text-sm font-semibold text-green-400">
            Registered {agent.name}
          </div>
          <div className="text-xs text-[var(--text-dim)] mt-1">
            Quality {agent.quality.toFixed(2)} · {agent.skills_count} skills ·{" "}
            {agent.commits_90d} commits · redirecting...
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd app && git add src/app/register && git commit -m "feat: add GitHub registration page"
```

---

## Task 20: Env example + README + vercel.json

**Files:**
- Create: `app/.env.local.example`
- Create: `app/vercel.json`
- Create: `app/README.md`

- [ ] **Step 1: Write `app/.env.local.example`**

```env
# Required for all Claude calls
ANTHROPIC_API_KEY=sk-ant-...

# Optional — raises GitHub rate limit from 60/hr to 5000/hr for /api/register
GITHUB_TOKEN=ghp_...

# Optional — shortcut to fixtures only, disables GitHub registration
MOCK_MODE=0

# Optional — force classifier output for demo safety
# Comma-separated key=tier pairs. Keys are matched substring-wise against task descriptions.
# FORCE_ROUTING=pricing=complex,landing=moderate,faq=simple
```

- [ ] **Step 2: Write `app/vercel.json`**

```json
{
  "functions": {
    "src/app/api/orchestrate/route.ts": { "maxDuration": 120 },
    "src/app/api/classify/route.ts": { "maxDuration": 30 },
    "src/app/api/register/route.ts": { "maxDuration": 30 }
  }
}
```

- [ ] **Step 3: Write `app/README.md`**

```markdown
# Nomos

Compute-routed agent marketplace. An orchestrator decomposes a goal, classifies each subtask
by complexity, routes each to the cheapest Claude model that can do it well (Haiku / Sonnet / Opus),
hires an agent from the marketplace, executes, and shows live savings vs a naive all-Opus baseline.

## Setup

```bash
pnpm install
cp .env.local.example .env.local   # set ANTHROPIC_API_KEY
pnpm dev
```

Open http://localhost:3000.

## Routes

- `/` — marketplace feed
- `/orchestrate` — live orchestration dashboard
- `/agents/[id]` — agent detail with per-tier metrics
- `/register` — register any GitHub repo as an agent

## API

- `GET /api/agents` — list agents sorted by quality desc
- `GET /api/agents/[id]` — agent detail
- `POST /api/classify` — `{description}` → `{tier, reason, estimated_tokens}`
- `POST /api/orchestrate` — `{goal}` → SSE stream of events (run_created, decomposed, classified, agent_assigned, task_started, task_completed, run_completed)
- `POST /api/register` — `{github_url}` → agent record

## Demo goal

> Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes.

Produces Opus (pricing) + Sonnet (landing) + Haiku (FAQ) → ~70% savings.

## Deploy

`vercel --prod`. Set `ANTHROPIC_API_KEY` in the Vercel project.
```

- [ ] **Step 4: Commit**

```bash
cd app && git add .env.local.example vercel.json README.md && git commit -m "chore: add env example, vercel config, and README"
```

---

## Task 21: Local end-to-end smoke

- [ ] **Step 1: Run typecheck + build**

```bash
cd app && pnpm build 2>&1 | tail -40
```
Expected: build succeeds. No TypeScript errors.

- [ ] **Step 2: Start dev server**

```bash
cd app && pnpm dev
```
Expected: server listens on 3000. No boot errors.

- [ ] **Step 3: Manual smoke in browser**

1. Open `http://localhost:3000/` — see 8 agent cards.
2. Click any card — detail page renders with per-tier pricing.
3. Open `/orchestrate`, keep default goal, click **Run orchestrator**.
4. Expect: 3–5 subtasks appear, each gets a tier badge within seconds, status transitions routed → working → done, savings panel shows naive vs actual vs saved %.
5. Confirm saved % ≥ 40. If lower, goal may need tuning or `FORCE_ROUTING` env var.
6. Open `/register`, submit a real public repo URL (e.g. `https://github.com/anthropics/anthropic-sdk-python`). Expect success and redirect to the detail page.

- [ ] **Step 4: If build/typecheck fails**

Read the error, fix the specific file referenced, re-run `pnpm build`. No task is complete until `pnpm build` succeeds.

- [ ] **Step 5: Commit any fixes**

```bash
cd app && git add -A && git commit -m "fix: resolve build errors from local smoke"
```

---

## Task 22: Deploy to Vercel

- [ ] **Step 1: Install Vercel CLI if needed**

```bash
pnpm add -g vercel
```

- [ ] **Step 2: First deploy (links project)**

```bash
cd app && vercel --yes
```
Follow prompts: scope = personal, link to existing = no, project name = `nomos` (or whatever user picks), directory = `./`, override settings = no.

- [ ] **Step 3: Set environment variables**

```bash
cd app && vercel env add ANTHROPIC_API_KEY production
# paste key when prompted
```
Optional:
```bash
cd app && vercel env add GITHUB_TOKEN production
```

- [ ] **Step 4: Production deploy**

```bash
cd app && vercel --prod
```
Expected: URL returned. Open it, verify marketplace renders and `/orchestrate` runs end-to-end on prod.

- [ ] **Step 5: If SSE is buffered by Vercel edge**

Symptom: orchestration events arrive all at once instead of streaming. Fix: confirm `vercel.json` functions block is present and `runtime = "nodejs"` is set on `route.ts`. Re-deploy.

- [ ] **Step 6: Commit deployment URL to README**

Edit `app/README.md` to add at the top:

```markdown
**Live:** https://nomos-xxx.vercel.app
```

```bash
cd app && git add README.md && git commit -m "docs: add live deploy URL"
```

---

## Task 23: Demo safety — REPLAY_MODE

**Files:**
- Create: `app/src/app/demo-replay/route.ts` (if record/replay via API)
- Create: `app/src/fixtures/demo-replay.json`
- Modify: `app/src/app/orchestrate/page.tsx` — support `?replay=1` query param

- [ ] **Step 1: Generate a real run once and save it**

After Task 21 local smoke, with dev server running, trigger a successful orchestration. Copy the sequence of SSE events from the browser Network tab (or add a temporary `console.log` in the `applyEvent` reducer) into `app/src/fixtures/demo-replay.json` as:

```json
{
  "goal": "Launch a new SaaS product: design the pricing tier architecture, write the landing page headline and hero copy, and format a 5-question FAQ section from these raw notes.",
  "events": [
    { "delay_ms": 0, "event": { "type": "run_created", "run": { "id": "replay", "goal": "...", "created_at": "2026-04-14T10:00:00Z", "subtasks": [], "total_actual_eth": 0, "total_naive_eth": 0, "saved_pct": 0, "status": "decomposing" } } },
    { "delay_ms": 2400, "event": { "type": "decomposed", "subtasks": [ /* ...real 3 subtasks from the live run... */ ] } },
    { "delay_ms": 600, "event": { "type": "classified", "subtask_id": "...", "classification": { "tier": "complex", "reason": "...", "estimated_tokens": 3200 }, "model": "opus" } }
    /* ...rest of the real event sequence, with small delays between them... */
  ]
}
```

- [ ] **Step 2: Add replay handling in `src/app/orchestrate/page.tsx`**

At the top of the component, after `const [goal, setGoal] = ...`, add:

```tsx
import replayData from "@/fixtures/demo-replay.json";

// ... inside component
const isReplay = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("replay") === "1";
```

Replace the `run` function to branch on `isReplay`:

```tsx
async function run() {
  setSubtasks([]);
  setTotals({ naive: 0, actual: 0, savedPct: 0 });
  setRunning(true);
  setFinished(false);
  setError(null);

  if (isReplay) {
    await playReplay();
    setRunning(false);
    return;
  }
  // ...existing live SSE code unchanged
}

async function playReplay() {
  const data = replayData as { events: Array<{ delay_ms: number; event: OrchestrationEvent }> };
  for (const { delay_ms, event } of data.events) {
    await new Promise((r) => setTimeout(r, delay_ms));
    setSubtasks((prev) => applyEvent(prev, event));
    if (event.type === "run_completed") {
      setTotals({
        naive: event.total_naive_eth,
        actual: event.total_actual_eth,
        savedPct: event.saved_pct,
      });
      setFinished(true);
    }
  }
}
```

Also add a small visual indicator near the Run button when replay mode is active:

```tsx
{isReplay && (
  <span className="text-xs text-[var(--savings)] font-mono">REPLAY MODE</span>
)}
```

- [ ] **Step 3: Commit**

```bash
cd app && git add src/fixtures/demo-replay.json src/app/orchestrate/page.tsx && git commit -m "feat: add REPLAY_MODE for demo safety via ?replay=1"
```

- [ ] **Step 4: Rehearse both paths**

Run live once (`/orchestrate`) and replay once (`/orchestrate?replay=1`). Confirm both reach the savings panel with similar numbers. The speaker must know which URL to use on stage based on network conditions at T-5 min.

---

## Cut-list (skip in order if behind schedule)

Each of these can be removed without breaking the core demo narrative:

1. **Task 19 (Register page)** — drop the live-registration demo beat. Marketplace still shows fixtures.
2. **Task 18 (Agent detail page)** — cards still exist; remove the `Link` wrapper in `AgentCard` to make it non-clickable.
3. **Task 8 + 11 (GitHub integration + /api/register)** — fixtures-only. Entire register flow cut.
4. **Task 16c (TeamHeader)** — decorative. Remove its use in `orchestrate/page.tsx`.
5. **Framer motion animations** — never added here; ignore if listed.

**Never cut:** classifier (Task 4), orchestrator (Task 6), executor (Task 7), SSE route (Task 12), orchestrate dashboard (Task 17), savings panel (Task 16a). Those are the demo.
