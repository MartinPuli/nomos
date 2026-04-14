import { TierBadge } from "./TierBadge";
import { ethToUsdc } from "@/lib/pricing";
import type { SubTask, Agent } from "@/lib/types";

const STATUS_LABEL: Record<SubTask["status"], string> = {
  pending:     "Queued",
  classifying: "Classifying…",
  routed:      "Routed",
  working:     "Working…",
  done:        "Done",
  error:       "Error",
};

const STATUS_STYLE: Record<SubTask["status"], { background: string; color: string }> = {
  pending:     { background: "var(--bg-elev2)",          color: "var(--text-muted)" },
  classifying: { background: "rgba(217,119,6,0.08)",     color: "#D97706"           },
  routed:      { background: "var(--blue-soft)",          color: "var(--ink)"        },
  working:     { background: "rgba(37,99,235,0.08)",     color: "var(--tier-sonnet)" },
  done:        { background: "rgba(5,150,105,0.08)",     color: "var(--tier-haiku)" },
  error:       { background: "rgba(220,38,38,0.08)",     color: "#DC2626"           },
};

export function TaskRow({ task, agent }: { task: SubTask; agent?: Agent }) {
  const st = STATUS_STYLE[task.status];

  return (
    <div
      className="card slide-up"
      style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}
    >
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.4 }}>
            {task.description}
          </div>
          {agent && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
              → {agent.handle}
            </div>
          )}
        </div>

        {/* Tier badge */}
        <div style={{ flexShrink: 0, width: "72px", display: "flex", justifyContent: "flex-end" }}>
          {task.status !== "pending" && task.status !== "classifying" ? (
            <TierBadge model={task.model} animated={task.status === "done"} />
          ) : (
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontFamily: "monospace" }}>—</span>
          )}
        </div>

        {/* Status chip */}
        <div
          style={{
            flexShrink: 0, minWidth: "90px", textAlign: "right",
            fontSize: "0.6875rem", fontFamily: "monospace",
            padding: "3px 8px", borderRadius: "6px",
            ...st,
          }}
        >
          {STATUS_LABEL[task.status]}
        </div>
      </div>

      {/* Classifier reason */}
      {task.classification && task.status !== "pending" && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", paddingLeft: "4px" }}>
          {task.classification.reason} · est. {task.classification.estimated_tokens.toLocaleString()} tokens
        </div>
      )}

      {/* Done: tokens + cost */}
      {task.status === "done" && (
        <div
          style={{
            borderTop: "1px solid var(--border)", paddingTop: "10px",
            display: "flex", justifyContent: "space-between", fontSize: "0.75rem",
          }}
        >
          <span style={{ color: "var(--text-dim)" }}>
            <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{task.actual_tokens.toLocaleString()}</span> tokens
          </span>
          <span style={{ color: "var(--text-dim)" }}>
            <span style={{ fontFamily: "monospace", color: "var(--tier-haiku)", fontWeight: 600 }}>{ethToUsdc(task.cost_eth)}</span> USDC
          </span>
        </div>
      )}

      {/* Output (collapsible) */}
      {task.status === "done" && task.output && (
        <details style={{ fontSize: "0.75rem" }}>
          <summary style={{ cursor: "pointer", color: "var(--text-muted)", userSelect: "none" }}>
            View output
          </summary>
          <pre
            style={{
              marginTop: "8px", whiteSpace: "pre-wrap", wordBreak: "break-word",
              background: "var(--bg-elev2)", border: "1px solid var(--border)",
              borderRadius: "8px", padding: "12px",
              color: "var(--text)", fontFamily: "monospace", fontSize: "0.75rem",
              lineHeight: 1.55, maxHeight: "200px", overflowY: "auto",
            }}
          >
            {task.output}
          </pre>
        </details>
      )}

      {/* Error */}
      {task.error && (
        <div style={{ fontSize: "0.75rem", color: "#DC2626" }}>Error: {task.error}</div>
      )}
    </div>
  );
}
