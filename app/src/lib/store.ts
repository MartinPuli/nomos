import type { Agent, Asset, OrchestrationRun } from "./types";

type Store = {
  agents: Map<string, Agent>;
  runs: Map<string, OrchestrationRun>;
  assets: Map<string, Asset>;
  seeded: boolean;
};

const g = globalThis as unknown as { __nomos_store?: Store };

export function getStore(): Store {
  if (!g.__nomos_store) {
    g.__nomos_store = {
      agents: new Map(),
      runs: new Map(),
      assets: new Map(),
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

export function listRuns(limit = 6): OrchestrationRun[] {
  return Array.from(getStore().runs.values())
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, limit);
}

export function saveAsset(asset: Asset): Asset {
  getStore().assets.set(asset.id, asset);
  return asset;
}

export function getAsset(id: string): Asset | undefined {
  return getStore().assets.get(id);
}

export function deleteAsset(id: string): boolean {
  return getStore().assets.delete(id);
}

export function listAssets(category?: string): Asset[] {
  const all = Array.from(getStore().assets.values()).sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
  );
  return category ? all.filter((a) => a.category === category) : all;
}
