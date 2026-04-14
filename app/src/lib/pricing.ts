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
