/**
 * Classifies a subtask description into a `Tier` using Haiku.
 *
 * Calls the classifier model with a strict JSON-only prompt, parses the
 * response, and falls back to `moderate` if the output can't be parsed — we
 * never let a broken classification take down an orchestration run. Honors the
 * `FORCE_ROUTING` env override (see `config.ts`) so demos can pin the tier for
 * known keywords without touching the model.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { CLASSIFIER_MODEL, parseForceRouting } from "./config";
import { ApiError, requireTrimmedString } from "./http";
import type { Classification, Tier } from "./types";

const SYSTEM_PROMPT = `You are a task complexity classifier. Given a subtask description, output JSON only:
{"tier": "simple" | "moderate" | "complex", "reason": "one sentence", "estimated_tokens": <integer>}

Rules:
- simple: formatting, extraction, translation, yes/no decisions (<500 tokens)
- moderate: writing, summarization, code generation, analysis (500-2000 tokens)
- complex: multi-step reasoning, architecture, strategy, evaluation (>2000 tokens)

Output VALID JSON only, no prose, no code fences.`;

function keyword(s: string): string | undefined {
  const lower = s.toLowerCase();
  if (/pricing|architect|strategy|design\s+the/.test(lower)) return "pricing";
  if (/landing|copy|headline|hero/.test(lower)) return "landing";
  if (/faq|format|bullet|structure/.test(lower)) return "faq";
  return undefined;
}

function applyForceRouting(description: string, base: Classification): Classification {
  const overrides = parseForceRouting();
  const k = keyword(description);
  if (k && overrides[k]) {
    const tier = overrides[k] as Tier;
    return { ...base, tier, reason: `[forced] ${base.reason}` };
  }
  return base;
}

export async function classify(description: string): Promise<Classification> {
  const normalizedDescription = requireTrimmedString(description, "description", {
    maxLength: 2000,
  });
  const client = getAnthropic();
  const res = await client.messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Subtask: ${normalizedDescription}` }],
  });
  const raw = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  // Strip markdown code fences that models sometimes add despite the prompt
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: Classification;
  try {
    parsed = JSON.parse(text) as Classification;
    if (!["simple", "moderate", "complex"].includes(parsed.tier)) {
      throw new Error(`invalid tier: ${parsed.tier}`);
    }
    if (typeof parsed.reason !== "string" || !parsed.reason.trim()) {
      throw new Error("invalid reason");
    }
    if (
      typeof parsed.estimated_tokens !== "number" ||
      !Number.isFinite(parsed.estimated_tokens) ||
      parsed.estimated_tokens <= 0
    ) {
      throw new Error("invalid estimated_tokens");
    }
  } catch {
    parsed = {
      tier: "moderate",
      reason: "classifier output unparseable, defaulting to moderate",
      estimated_tokens: 1000,
    };
  }
  try {
    return applyForceRouting(normalizedDescription, parsed);
  } catch {
    throw new ApiError(502, "classifier_failed", "classifier failed to produce a usable result");
  }
}
