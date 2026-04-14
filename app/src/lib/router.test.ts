import { describe, expect, it } from "vitest";
import { selectAgent, tierToModel } from "./router";
import type { Agent } from "./types";

function makeAgent(overrides: Partial<Agent>): Agent {
  return {
    id: "agent",
    name: "Agent",
    handle: "@agent",
    description: "test agent",
    source: "fixture",
    skills: ["general"],
    default_tier: "moderate",
    metrics: {
      avg_tokens_per_task: { simple: 400, moderate: 1000, complex: 2500 },
      tasks_completed: 10,
      tasks_attempted: 10,
      success_rate: 0.9,
    },
    skills_count: 1,
    commits_90d: 5,
    quality: 0.8,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("router", () => {
  it("maps tiers to models", () => {
    expect(tierToModel("simple")).toBe("haiku");
    expect(tierToModel("moderate")).toBe("sonnet");
    expect(tierToModel("complex")).toBe("opus");
  });

  it("prefers an agent with tier match, skill match, and better efficiency", () => {
    const selected = selectAgent(
      [
        makeAgent({
          id: "generalist",
          name: "Generalist",
          skills: ["general"],
          default_tier: "moderate",
          quality: 0.95,
          metrics: {
            avg_tokens_per_task: { moderate: 1800 },
            tasks_completed: 10,
            tasks_attempted: 10,
            success_rate: 0.9,
          },
        }),
        makeAgent({
          id: "copy-pro",
          name: "Copy Pro",
          skills: ["copywriting", "landing_pages", "hero_copy"],
          default_tier: "moderate",
          quality: 0.82,
          metrics: {
            avg_tokens_per_task: { moderate: 900 },
            tasks_completed: 20,
            tasks_attempted: 22,
            success_rate: 0.91,
          },
        }),
      ],
      "moderate",
      "copywriting landing pages",
    );

    expect(selected.id).toBe("copy-pro");
  });

  it("throws when no agents are available", () => {
    expect(() => selectAgent([], "simple")).toThrow("no agents available");
  });
});