"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const LINKS = [
  { href: "/",            label: "Marketplace" },
  { href: "/orchestrate", label: "Run a team"   },
  { href: "/register",    label: "Add agent"    },
  { href: "/inbox",       label: "Inbox"        },
  { href: "/assets",      label: "Assets"       },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav
      style={{
        borderBottom: "2px solid var(--ink)",
        background: "rgba(255,246,237,0.92)",
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
          <Image src="/nomos-logo.svg" alt="Nomos" width={30} height={30} priority />
          <span
            className="font-display"
            style={{ fontSize: "1.25rem", color: "var(--text)", lineHeight: 1, letterSpacing: "0.01em" }}
          >
            nomos
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

        {/* Wallet */}
        <WalletButton />
      </div>
    </nav>
  );
}
