import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { CLASSIFIER_MODEL, parseForceRouting } from "./config";
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
  const client = getAnthropic();
  const res = await client.messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Subtask: ${description}` }],
  });
  const text = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  let parsed: Classification;
  try {
    parsed = JSON.parse(text) as Classification;
    if (!["simple", "moderate", "complex"].includes(parsed.tier)) {
      throw new Error(`invalid tier: ${parsed.tier}`);
    }
  } catch {
    parsed = {
      tier: "moderate",
      reason: "classifier output unparseable, defaulting to moderate",
      estimated_tokens: 1000,
    };
  }
  return applyForceRouting(description, parsed);
}
