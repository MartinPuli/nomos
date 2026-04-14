import type { Tier, ModelId } from "@/lib/types";

const LABEL: Record<ModelId, string> = {
  haiku: "HAIKU",
  sonnet: "SONNET",
  opus: "OPUS",
};

const TIER_TO_MODEL: Record<Tier, ModelId> = {
  simple: "haiku",
  moderate: "sonnet",
  complex: "opus",
};

export function TierBadge({ tier, model, size = "sm" }: { tier?: Tier; model?: ModelId; size?: "sm" | "md" }) {
  const m: ModelId = model ?? (tier ? TIER_TO_MODEL[tier] : "sonnet");
  const sz = size === "md" ? "text-xs px-3 py-1" : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={`inline-block rounded-full font-mono font-bold uppercase border bg-tier-${m} tier-${m} ${sz}`}
    >
      {LABEL[m]}
    </span>
  );
}
