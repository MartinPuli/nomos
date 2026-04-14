"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",            label: "Marketplace" },
  { href: "/orchestrate", label: "Run a team"   },
  { href: "/register",    label: "Add agent"    },
  { href: "/inbox",       label: "Inbox"        },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        background: "rgba(250,250,249,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6"
        style={{ height: "52px", display: "flex", alignItems: "center", gap: "24px" }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "9px", flexShrink: 0, textDecoration: "none" }}
        >
          <Image src="/nomos-logo.svg" alt="Gnomos" width={30} height={30} priority />
          <span
            className="font-display"
            style={{ fontSize: "1.25rem", color: "var(--text)", lineHeight: 1, letterSpacing: "0.01em" }}
          >
            Gnomos
          </span>
        </Link>

        {/* Divider */}
        <div style={{ width: "1px", height: "18px", background: "var(--border)", flexShrink: 0 }} />

        {/* Links */}
        <div style={{ display: "flex", gap: "2px", flex: 1 }}>
          {LINKS.map(({ href, label }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "5px 11px",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  textDecoration: "none",
                  color: active ? "var(--text)" : "var(--text-dim)",
                  background: active ? "var(--bg-elev2)" : "transparent",
                  fontWeight: active ? 500 : 400,
                  transition: "color 0.12s, background 0.12s",
                  letterSpacing: "-0.005em",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Wallet pill */}
        <div
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
          }}
        >
          <span
            className="pulse-dot"
            style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--savings)", flexShrink: 0 }}
          />
          <span className="hidden sm:inline">0x1a2b…ef12</span>
        </div>
      </div>
    </nav>
  );
}
