import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nomos.vercel.app";
const SITE_NAME = "Nomos";
const SITE_DESCRIPTION =
  "Rent pre-assembled agent teams. Every subtask runs on the cheapest Claude model that can still do it well — Haiku, Sonnet or Opus.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Compute-routed marketplace for AI agent teams`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI agents",
    "agent marketplace",
    "Claude",
    "Anthropic",
    "multi-agent",
    "LLM routing",
    "compute routing",
    "Haiku",
    "Sonnet",
    "Opus",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Compute-routed marketplace for AI agent teams`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Compute-routed marketplace for AI agent teams`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f0e2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f10" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Nav />
        <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
        <footer style={{ borderTop: "1px solid var(--border)", marginTop: "80px" }}>
          <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="font-display" style={{ fontSize: "1rem", color: "var(--text-dim)" }}>nomos</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>© 2025</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span
                style={{
                  fontSize: "0.6875rem", color: "var(--text-muted)",
                  fontFamily: "JetBrains Mono, monospace",
                  background: "var(--bg-elev2)", border: "1px solid var(--border)",
                  padding: "3px 10px", borderRadius: "6px",
                }}
              >
                Sepolia testnet
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Haiku · Sonnet · Opus
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
