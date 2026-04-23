import { ethToUsdc } from "@/lib/pricing";

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
  const ratio     = naive > 0 ? actual / naive : 0.28;
  const savedEth  = Math.max(0, naive - actual);
  const costRatio = naive > 0 && actual > 0 ? naive / actual : 5;
  const isGood    = savedPct >= 50;

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Top accent */}
      <div style={{ height: "3px", background: isGood ? "var(--savings)" : "#D97706" }} />

      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
          Cost comparison
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {live && (
            <>
              <span className="pulse-dot" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--savings)" }} />
              <span style={{ fontSize: "0.6875rem", color: "var(--savings)", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>live</span>
            </>
          )}
          {!live && savedPct > 0 && (
            <span
              style={{
                fontSize: "0.625rem", fontFamily: "JetBrains Mono, monospace", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                background: "var(--tier-haiku-bg)", color: "var(--tier-haiku)",
                padding: "3px 9px", borderRadius: "999px",
                border: "1px solid var(--tier-haiku-border)",
              }}
            >
              complete
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Big savings number */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ flex: 1 }}>
            <div
              className="font-display counter-up"
              style={{
                fontSize: "4rem",
                lineHeight: 1,
                color: isGood ? "var(--savings)" : "#D97706",
                letterSpacing: "0.01em",
              }}
            >
              {savedPct.toFixed(1)}%
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)", marginTop: "6px" }}>
              cheaper than Opus-for-everything
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px", fontFamily: "JetBrains Mono, monospace" }}>
              saved {ethToUsdc(savedEth)} USDC
            </div>
          </div>

          {/* Cost ratio callout */}
          <div
            style={{
              textAlign: "right", padding: "14px 16px", borderRadius: "14px",
              background: "var(--terere-soft)", border: "2px solid var(--ink)",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.22em", color: "var(--ink)", marginBottom: "4px", fontWeight: 600 }}>
              vs all-Opus
            </div>
            <div
              className="font-display"
              style={{ fontSize: "1.25rem", color: "var(--accent)", lineHeight: 1 }}
            >
              {costRatio.toFixed(1)}×
            </div>
            <div style={{ fontSize: "0.6875rem", color: "var(--accent)", opacity: 0.7, marginTop: "2px" }}>cheaper</div>
          </div>
        </div>

        {/* Bar comparison */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Naive */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "rgba(220,38,38,0.5)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Naive — all Opus</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text-dim)" }}>{ethToUsdc(naive)} USDC</span>
              </div>
            </div>
            <div style={{ height: "6px", background: "var(--bg-elev2)", borderRadius: "3px" }}>
              <div style={{ height: "100%", borderRadius: "3px", background: "rgba(220,38,38,0.3)", width: "100%" }} />
            </div>
          </div>

          {/* Routed */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--savings)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Routed — Nomos</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--savings)", fontWeight: 700 }}>{ethToUsdc(actual)} USDC</span>
              </div>
            </div>
            <div style={{ height: "6px", background: "var(--bg-elev2)", borderRadius: "3px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%", borderRadius: "3px",
                  background: "linear-gradient(to right, var(--tier-haiku), var(--savings))",
                  width: `${ratio * 100}%`,
                  transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
