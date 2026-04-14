import { TierBadge } from "./TierBadge";
import type { SubTask, Agent } from "@/lib/types";

const STATUS_LABEL: Record<SubTask["status"], string> = {
  pending: "QUEUED",
  classifying: "CLASSIFYING",
  routed: "READY",
  working: "WORKING",
  done: "DONE",
  error: "ERROR",
};

export function TaskRow({
  task,
  agent,
}: {
  task: SubTask;
  agent?: Agent;
}) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm">{task.description}</div>
          {agent && (
            <div className="text-xs text-[var(--text-dim)] mt-1">
              Assigned to {agent.handle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.status !== "pending" && task.status !== "classifying" && (
            <TierBadge model={task.model} />
          )}
          <span
            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
              task.status === "done"
                ? "bg-green-500/15 text-green-400"
                : task.status === "error"
                ? "bg-red-500/15 text-red-400"
                : task.status === "working"
                ? "bg-yellow-500/15 text-yellow-400"
                : "bg-[var(--bg-elev2)] text-[var(--text-dim)]"
            }`}
          >
            {STATUS_LABEL[task.status]}
          </span>
        </div>
      </div>
      {task.classification && (
        <div className="text-xs text-[var(--text-dim)] italic">
          Classifier: {task.classification.reason}
        </div>
      )}
      {task.status === "done" && (
        <div className="grid grid-cols-2 gap-3 text-xs border-t border-[var(--border)] pt-3">
          <div>
            <span className="text-[var(--text-dim)]">Tokens: </span>
            <span className="font-mono">{task.actual_tokens.toLocaleString()}</span>
          </div>
          <div className="text-right">
            <span className="text-[var(--text-dim)]">Cost: </span>
            <span className="font-mono">{task.cost_eth.toFixed(6)} ETH</span>
          </div>
        </div>
      )}
      {task.status === "done" && task.output && (
        <details className="text-xs">
          <summary className="cursor-pointer text-[var(--text-dim)] hover:text-white">
            View output
          </summary>
          <pre className="mt-2 whitespace-pre-wrap bg-[var(--bg-elev2)] p-3 rounded text-[var(--text)]">
            {task.output}
          </pre>
        </details>
      )}
      {task.error && (
        <div className="text-xs text-red-400">Error: {task.error}</div>
      )}
    </div>
  );
}
