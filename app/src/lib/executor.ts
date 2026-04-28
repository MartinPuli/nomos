/**
 * Runs one subtask on the routed model with a persona system prompt.
 *
 * The system prompt is built from the agent (name, description, skills) + the
 * classifier's tier, which nudges verbosity. Max output tokens scale with
 * tier (haiku 1500 → opus 2048). Returns the produced text plus real token
 * usage from the API response so pricing uses actual, not estimated, tokens.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { MODEL_IDS } from "./config";
import type { Agent, ModelId } from "./types";

function buildSubagentSystem(agent: Agent, tier: string): string {
  return `You are ${agent.name} (${agent.handle}). ${agent.description}

Your skills: ${agent.skills.join(", ")}.
You are operating at the "${tier}" complexity tier. Be concise, direct, and lead with your core specialty. Produce exactly one deliverable — no preamble, no meta-commentary. Target length: short to medium.

You MUST respond with a JSON object matching this schema, and NOTHING else.
Do NOT wrap it in markdown fences. Do NOT add any preamble.

{
  "summary": "<1-2 sentence high-level description of what you did>",
  "body_markdown": "<the main answer, in GitHub-flavored markdown>",
  "artifacts": [
    { "type": "code", "title": "Example", "language": "ts", "content": "..." },
    { "type": "table", "title": "Comparison", "columns": ["A", "B"], "rows": [["x", "y"]] }
  ],
  "next_steps": ["Optional bullet points of what to do next"]
}

The "artifacts" and "next_steps" fields are optional — omit them if not relevant.`;
}

export interface ExecutionResult {
  output: string;
  input_tokens: number;
  output_tokens: number;
  actual_tokens: number;
}

const MAX_OUTPUT_TOKENS: Record<ModelId, number> = {
  haiku: 1500,
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
