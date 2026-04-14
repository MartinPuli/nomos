import type { Team, Agent } from "./types";
import { getStore } from "./store";
import { getAgent } from "./store";

export function upsertTeam(team: Team): Team {
  const store = getStore() as unknown as { teams?: Map<string, Team> } & ReturnType<typeof getStore>;
  if (!store.teams) store.teams = new Map<string, Team>();
  store.teams.set(team.id, team);
  return team;
}

export function listTeams(): Team[] {
  const store = getStore() as unknown as { teams?: Map<string, Team> };
  if (!store.teams) return [];
  return Array.from(store.teams.values()).sort((a, b) => b.quality - a.quality);
}

export function getTeam(id: string): Team | undefined {
  const store = getStore() as unknown as { teams?: Map<string, Team> };
  return store.teams?.get(id);
}

export function teamMembers(team: Team): Agent[] {
  return team.member_ids
    .map((id) => getAgent(id))
    .filter((a): a is Agent => !!a);
}

export function teamTierMix(team: Team): Record<"simple" | "moderate" | "complex", number> {
  const mix = {
    simple: 0,
    moderate: 0,
    complex: 0,
  };
  for (const member of teamMembers(team)) {
    mix[member.default_tier] += 1;
  }
  return mix;
}

export function teamAverageSuccessRate(team: Team): number {
  const members = teamMembers(team);
  if (members.length === 0) return 0;
  const total = members.reduce((sum, member) => sum + member.metrics.success_rate, 0);
  return total / members.length;
}

export function teamGithubBackedCount(team: Team): number {
  return teamMembers(team).filter((member) => member.source === "github").length;
}
