import type { Agent, OrchestrationRun } from "./types";

type Store = {
  agents: Map<string, Agent>;
  runs: Map<string, OrchestrationRun>;
  seeded: boolean;
};

const g = globalThis as unknown as { __agentmarket_store?: Store };

export function getStore(): Store {
  if (!g.__agentmarket_store) {
    g.__agentmarket_store = {
      agents: new Map(),
      runs: new Map(),
      seeded: false,
    };
  }
  return g.__agentmarket_store;
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
