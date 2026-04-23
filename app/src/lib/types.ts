/**
 * Domain types shared by UI, API routes, and the orchestration pipeline.
 *
 * `Tier` is the classifier output bucket; `ModelId` is the Claude variant the
 * router picks for that tier (haiku / sonnet / opus). `OrchestrationRun` +
 * `SubTask` describe one end-to-end run (goal → decompose → classify → route →
 * execute) and stream to the client as `OrchestrationEvent`s over SSE from
 * `/api/orchestrate`. `Team` / `SubscriptionTier` model the marketplace layer
 * (teams are pre-assembled agent squads clients can subscribe to).
 */
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
  source?: "fixture" | "github";
  skills: string[];
  default_tier: Tier;
  github_url?: string;
  metrics: AgentMetrics;
  skills_count: number;
  commits_90d: number;
  quality: number;
  created_at: string;
  tagline?: string;
  specialty?: string;
  rent_price_eth_per_task?: number;
  maintainer_email?: string;
  wallet_eth?: string;
  team_ready?: boolean;
}

export interface AgentRegistrationInput {
  github_url: string;
  name?: string;
  handle?: string;
  tagline?: string;
  specialty?: string;
  default_tier?: Tier;
  extra_skills?: string[];
  rent_price_eth_per_task?: number;
  maintainer_email?: string;
  wallet_eth?: string;
  team_ready?: boolean;
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
  team_id?: string;
  team_name?: string;
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

export interface Team {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  specialty: string;
  member_ids: string[];
  skills_union: string[];
  tasks_completed: number;
  avg_tokens_per_task: number;
  avg_savings_pct: number;
  rent_price_eth_per_task: number;
  quality: number;
  cover_emoji: string;
  created_at: string;
  // v3 fields
  vertical: Vertical;
  languages: string[];
  jurisdictions?: string[];
  lead_agent_id: string;
  tiers: SubscriptionTier[];
  disclaimer?: string;
  active_subscriptions: number;
  avg_rating: number;
  retention_rate: number;
  avg_turnaround_hours: number;
}

export type Vertical =
  | "legal"
  | "content"
  | "marketing"
  | "research"
  | "localization"
  | "support"
  | "operations"
  | "design"
  | "data"
  | "accounting";

export type AssetCategory = "image" | "font" | "color" | "data" | "document";

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  mime_type: string;
  url: string;
  size: number;
  uploaded_at: string;
  tags: string[];
}

export interface SubscriptionTier {
  id: string;
  name: string;
  monthly_price_usd: number;
  included_tasks_per_month: number | "unlimited";
  sla_hours: number;
  features: string[];
}
