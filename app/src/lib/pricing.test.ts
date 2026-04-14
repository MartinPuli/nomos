import { describe, expect, it } from "vitest";
import { agentQualityScore, computeSavings, ethToUsd, taskPriceEth } from "./pricing";

describe("pricing", () => {
  it("computes agent quality score deterministically", () => {
    expect(agentQualityScore(8, 22, 0.93)).toBe(0.679);
  });

  it("prices a task from model, tokens, and quality", () => {
    expect(taskPriceEth("sonnet", 1200, 0.85)).toBe(0.005184);
  });

  it("computes savings against a naive all-opus baseline", () => {
    const result = computeSavings([
      { model: "haiku", actual_tokens: 340 } as never,
      { model: "sonnet", actual_tokens: 1100 } as never,
      { model: "sonnet", actual_tokens: 900 } as never,
    ]);

    expect(result).toEqual({
      naive_eth: 0.0351,
      actual_eth: 0.00634,
      saved_pct: 81.9,
    });
  });

  it("converts ETH to USD with a configurable rate", () => {
    expect(ethToUsd(0.0012, 3200)).toBe(3.84);
  });
});