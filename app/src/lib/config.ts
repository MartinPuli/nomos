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
