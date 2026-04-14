import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { MODEL_IDS } from "./config";
import type { Agent, ModelId } from "./types";

function buildSubagentSystem(agent: Agent, tier: string): string {
  return `You are ${agent.name} (${agent.handle}). ${agent.description}

Your skills: ${agent.skills.join(", ")}.
You are operating at the "${tier}" complexity tier. Be concise, direct, and stay strictly within your skill boundary. Produce exactly one deliverable — no preamble, no meta-commentary. Target length: short to medium.`;
}

export interface ExecutionResult {
  output: string;
  input_tokens: number;
  output_tokens: number;
  actual_tokens: number;
}

const MAX_OUTPUT_TOKENS: Record<ModelId, number> = {
  haiku: 512,
  sonnet: 1024,
  opus: 2048,
};

export async function runSubagent(
  agent: Agent,
  model: ModelId,
  tier: string,
  taskDescription: string,
): Promise<ExecutionResult> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: MODEL_IDS[model],
    max_tokens: MAX_OUTPUT_TOKENS[model],
    system: buildSubagentSystem(agent, tier),
    messages: [{ role: "user", content: taskDescription }],
  });
  const output = res.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  const input_tokens = res.usage.input_tokens;
  const output_tokens = res.usage.output_tokens;
  return {
    output,
    input_tokens,
    output_tokens,
    actual_tokens: input_tokens + output_tokens,
  };
}
