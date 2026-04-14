let providerPromise: Promise<any> | null = null;

/**
 * Returns an EIP-1193 provider.
 * Prefers the injected MetaMask extension; falls back to @metamask/connect-evm SDK.
 */
export async function getWalletClient(): Promise<any> {
  const injected =
    typeof window !== "undefined" ? (window as any).ethereum : null;

  // Fast path: MetaMask extension is already present
  if (injected?.isMetaMask) return injected;

  // Slow path: load SDK for mobile / QR connection
  if (!providerPromise) {
    providerPromise = (async () => {
      try {
        const { createEVMClient } = await import("@metamask/connect-evm");
        return await createEVMClient({
          dappMetadata: {
            name: "Nomos",
            url: typeof window !== "undefined"
              ? window.location.origin
              : "https://nomos.market",
          },
        });
      } catch {
        // If SDK fails, fall back to any injected provider
        if (injected) return injected;
        throw new Error("No wallet found. Install MetaMask to continue.");
      }
    })();
  }
  return providerPromise;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
