import { ethToUsd } from "@/lib/pricing";

export function SavingsPanel({
  naive,
  actual,
  savedPct,
  live,
}: {
  naive: number;
  actual: number;
  savedPct: number;
  live: boolean;
}) {
  const fmt = (n: number) => n.toFixed(6);
  const savedEth = Math.max(0, naive - actual);
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-[var(--text-dim)]">
          Compute savings
        </div>
        {live && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <span className="w-2 h-2 rounded-full bg-[var(--savings)] animate-pulse" />
            routing live
          </div>
        )}
      </div>
      <div className="flex items-end gap-6">
        <div>
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Naive (all-Opus)</div>
          <div className="font-mono text-xl line-through text-[var(--text-dim)]">
            {fmt(naive)} ETH
          </div>
          <div className="text-xs text-[var(--text-dim)]">${ethToUsd(naive).toFixed(2)} USD</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[var(--text-dim)]">Routed actual</div>
          <div className="font-mono text-xl">{fmt(actual)} ETH</div>
          <div className="text-xs text-[var(--text-dim)]">${ethToUsd(actual).toFixed(2)} USD</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase text-[var(--savings)]">Saved</div>
          <div className="font-mono text-4xl font-bold text-[var(--savings)]">
            {savedPct.toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--savings)]">{fmt(savedEth)} ETH saved</div>
        </div>
      </div>
    </div>
  );
}
