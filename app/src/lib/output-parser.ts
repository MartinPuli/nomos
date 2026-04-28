import type { SubtaskOutput } from "./types";

export type ParsedOutput =
  | { kind: "structured"; data: SubtaskOutput }
  | { kind: "raw"; text: string };

export function parseSubtaskOutput(raw: string): ParsedOutput {
  if (!raw || typeof raw !== "string") {
    return { kind: "raw", text: raw ?? "" };
  }

  // Try to find a JSON object — handles models that wrap in fences despite instructions
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : raw;

  try {
    const parsed = JSON.parse(candidate);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.summary === "string" &&
      typeof parsed.body_markdown === "string"
    ) {
      const artifacts = Array.isArray(parsed.artifacts)
        ? parsed.artifacts.filter(isValidArtifact)
        : undefined;

      const next_steps = Array.isArray(parsed.next_steps)
        ? parsed.next_steps.filter((s: unknown) => typeof s === "string")
        : undefined;

      return {
        kind: "structured",
        data: {
          summary: parsed.summary,
          body_markdown: parsed.body_markdown,
          artifacts,
          next_steps,
        },
      };
    }
  } catch {
    // fall through to raw
  }

  return { kind: "raw", text: raw };
}

function isValidArtifact(a: unknown): boolean {
  if (typeof a !== "object" || a === null) return false;
  const x = a as Record<string, unknown>;
  if (typeof x.type !== "string") return false;
  return ["code", "file", "link", "table", "quote"].includes(x.type);
}
