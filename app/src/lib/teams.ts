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
