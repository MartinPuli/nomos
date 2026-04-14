"use client";

import { useCallback, useEffect, useState } from "react";
import { getWalletClient, shortenAddress } from "@/lib/wallet";

export function WalletButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already connected on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = await getWalletClient();
        const accounts = (await client.request({
          method: "eth_accounts",
          params: [],
        })) as string[];
        if (!cancelled && accounts.length > 0) {
          setAddress(accounts[0]);
        }
      } catch {
        // Not connected yet, that's fine
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const client = await getWalletClient();
      const accounts = (await client.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];
      if (accounts.length > 0) {
        setAddress(accounts[0]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      // Don't show error if user just rejected
      if (!message.toLowerCase().includes("rejected") && !message.toLowerCase().includes("denied")) {
        setError(message);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  if (address) {
    return (
      <button
        onClick={disconnect}
        title="Click to disconnect"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          borderRadius: "999px",
          background: "var(--bg-elev2)",
          border: "1px solid var(--border)",
          fontSize: "0.6875rem",
          fontFamily: "JetBrains Mono, monospace",
          color: "var(--text-muted)",
          flexShrink: 0,
          letterSpacing: "0.02em",
          cursor: "pointer",
          transition: "border-color 0.12s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
      >
        <span
          className="pulse-dot"
          style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--savings)", flexShrink: 0 }}
        />
        <span className="hidden sm:inline">{shortenAddress(address)}</span>
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      title={error ?? "Connect MetaMask"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 12px",
        borderRadius: "999px",
        background: connecting ? "var(--bg-elev2)" : "var(--accent)",
        border: "1px solid transparent",
        fontSize: "0.6875rem",
        fontFamily: "JetBrains Mono, monospace",
        color: connecting ? "var(--text-muted)" : "white",
        flexShrink: 0,
        letterSpacing: "0.02em",
        cursor: connecting ? "wait" : "pointer",
        fontWeight: 600,
        transition: "opacity 0.12s",
        opacity: connecting ? 0.6 : 1,
      }}
    >
      {connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
