import Link from "next/link";

export function Nav() {
  return (
    <nav className="border-b border-[var(--border)] px-6 py-4 flex items-center gap-6">
      <Link href="/" className="font-bold text-lg tracking-tight">
        ⟐ <span className="text-[var(--accent)]">AgentMarket</span>
      </Link>
      <div className="flex gap-5 text-sm text-[var(--text-dim)]">
        <Link href="/" className="hover:text-white">Marketplace</Link>
        <Link href="/orchestrate" className="hover:text-white">Orchestrate</Link>
        <Link href="/register" className="hover:text-white">Register agent</Link>
      </div>
      <div className="ml-auto text-xs text-[var(--text-dim)]">
        compute-routed · demo build
      </div>
    </nav>
  );
}
