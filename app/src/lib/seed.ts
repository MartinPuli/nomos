import agentsFixture from "@/fixtures/agents.json";
import teamsFixture from "@/fixtures/teams.json";
import type { Agent, Team } from "./types";
import { agentQualityScore } from "./pricing";
import { getStore, upsertAgent } from "./store";
import { upsertTeam } from "./teams";

type RawAgent = Omit<Agent, "quality">;

export function ensureSeeded(): void {
  const store = getStore();
  if (store.seeded) return;
  for (const raw of agentsFixture as RawAgent[]) {
    const quality = agentQualityScore(
      raw.skills_count,
      raw.commits_90d,
      raw.metrics.success_rate,
    );
    upsertAgent({ ...raw, source: raw.source ?? "fixture", quality });
  }
  for (const team of teamsFixture as Team[]) {
    upsertTeam(team);
  }
  store.seeded = true;
}
