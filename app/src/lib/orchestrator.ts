import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "./anthropic";
import { ORCHESTRATOR_MODEL } from "./config";

interface DecomposedSubtask {
  description: string;
  skill_hint: string;
}

const ORCHESTRATOR_SYSTEM = `You are an orchestrator. Given a product/work goal, decompose it into 3 to 5 well-scoped subtasks that can each be delegated to a specialized agent. Subtasks must be independent, produce distinct outputs, and span different complexity levels when possible (simple formatting, moderate writing, complex strategy).

You MUST call the "submit_subtasks" tool exactly once with your decomposition. Do not reply with prose.`;

const TOOL = {
  name: "submit_subtasks",
  description: "Submit the decomposed subtasks for the goal",
  input_schema: {
    type: "object" as const,
    properties: {
      subtasks: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description:
                "Imperative subtask description (e.g., 'Design the pricing tier structure for the SaaS product')",
            },
            skill_hint: {
              type: "string",
              description:
                "Short tag matching an expected agent skill (e.g., 'pricing', 'copywriting', 'formatting')",
            },
          },
          required: ["description", "skill_hint"],
        },
      },
    },
    required: ["subtasks"],
  },
};

export async function decompose(goal: string): Promise<DecomposedSubtask[]> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: ORCHESTRATOR_MODEL,
    max_tokens: 1024,
    system: ORCHESTRATOR_SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "submit_subtasks" },
    messages: [{ role: "user", content: `Goal: ${goal}` }],
  });
  const toolUse = res.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
  );
  if (!toolUse) throw new Error("orchestrator did not call submit_subtasks");
  const input = toolUse.input as { subtasks: DecomposedSubtask[] };
  if (!input.subtasks || input.subtasks.length < 3) {
    throw new Error("orchestrator returned fewer than 3 subtasks");
  }
  return input.subtasks;
}
