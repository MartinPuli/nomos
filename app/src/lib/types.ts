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
}
