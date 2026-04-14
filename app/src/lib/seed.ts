import fixturesData from "@/fixtures/agents.json";
import type { Agent } from "./types";
import { agentQualityScore } from "./pricing";
import { getStore, upsertAgent } from "./store";

type RawAgent = Omit<Agent, "quality">;

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
