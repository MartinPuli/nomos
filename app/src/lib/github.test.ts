import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./http";
import { registerFromGithub } from "./github";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("registerFromGithub", () => {
  it("rejects invalid GitHub URLs", async () => {
    await expect(registerFromGithub("https://example.com/foo/bar")).rejects.toMatchObject({
      code: "invalid_github_url",
    } satisfies Partial<ApiError>);
  });

  it("uses fallback skills and metrics when repo files are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/contents/skills.md")) return Promise.resolve(jsonResponse({}, 404));
        if (url.includes("/contents/memory/metrics.json")) return Promise.resolve(jsonResponse({}, 404));
        if (url.includes("/commits?")) return Promise.resolve(jsonResponse([], 200));
        return Promise.resolve(jsonResponse({}, 500));
      }),
    );

    const agent = await registerFromGithub("https://github.com/acme/demo-agent");

    expect(agent.source).toBe("github");
    expect(agent.skills).toEqual(["general"]);
    expect(agent.metrics.avg_tokens_per_task).toEqual({
      simple: 400,
      moderate: 1200,
      complex: 2800,
    });
    expect(agent.metrics.success_rate).toBe(0.75);
  });

  it("falls back to default metrics when metrics.json is malformed", async () => {
    const skillsMd = Buffer.from("- pricing\n- packaging strategy", "utf-8").toString("base64");
    const brokenMetrics = Buffer.from("{not-json}", "utf-8").toString("base64");

    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/contents/skills.md")) {
          return Promise.resolve(jsonResponse({ content: skillsMd, encoding: "base64" }));
        }
        if (url.includes("/contents/memory/metrics.json")) {
          return Promise.resolve(jsonResponse({ content: brokenMetrics, encoding: "base64" }));
        }
        if (url.includes("/commits?")) return Promise.resolve(jsonResponse([{}, {}, {}], 200));
        return Promise.resolve(jsonResponse({}, 500));
      }),
    );

    const agent = await registerFromGithub("https://github.com/acme/pricing-bot");

    expect(agent.skills).toEqual(["pricing", "packaging_strategy"]);
    expect(agent.metrics.success_rate).toBe(0.75);
    expect(agent.commits_90d).toBe(3);
  });

  it("returns a friendly rate-limit error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/commits?")) return Promise.resolve(jsonResponse({}, 403));
        return Promise.resolve(jsonResponse({}, 404));
      }),
    );

    await expect(registerFromGithub("https://github.com/acme/rate-limited")).rejects.toMatchObject({
      code: "github_rate_limited",
    } satisfies Partial<ApiError>);
  });
});