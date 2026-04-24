"use client";

import { useEffect, useRef, useState } from "react";
import type { Asset, AssetCategory } from "@/lib/types";

const CATEGORIES: { id: AssetCategory | "all"; label: string; emoji: string }[] = [
  { id: "all",      label: "All",       emoji: "📁" },
  { id: "image",    label: "Images",    emoji: "🖼️" },
  { id: "font",     label: "Fonts",     emoji: "🔤" },
  { id: "color",    label: "Colors",    emoji: "🎨" },
  { id: "data",     label: "Data",      emoji: "📊" },
  { id: "document", label: "Documents", emoji: "📄" },
];

const ACCEPT = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "font/otf", "font/ttf", "font/woff", "font/woff2",
  ".otf", ".ttf", ".woff", ".woff2",
  "application/json", "text/css",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
].join(",");

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<AssetCategory | "all">("all");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchAssets() {
    const url = filter === "all" ? "/api/assets" : `/api/assets?category=${filter}`;
    const res = await fetch(url);
    if (res.ok) setAssets(await res.json());
  }

  useEffect(() => { fetchAssets(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch("/api/assets", { method: "POST", body: fd });
    }
    setUploading(false);
    fetchAssets();
  }

  async function remove(id: string) {
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  function copyUrl(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1 className="font-display" style={{ fontSize: "clamp(2rem, 5vw, 3rem)", margin: 0, lineHeight: 1.15 }}>
          Asset library
        </h1>
        <p style={{ color: "var(--text-dim)", marginTop: "8px", fontSize: "0.9375rem" }}>
          Upload images, fonts, colors, spreadsheets and documents for your agent teams.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragging ? "var(--ink)" : "var(--border-strong)"}`,
          borderRadius: "16px",
          padding: "40px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "var(--bg-elev2)" : "var(--bg-elev)",
          transition: "background 0.12s, border-color 0.12s",
        }}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPT} style={{ display: "none" }} onChange={(e) => upload(e.target.files)} />
        <div style={{ fontSize: "2rem", marginBottom: "8px" }}>
          {uploading ? "⏳" : "📂"}
        </div>
        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
          {uploading ? "Uploading…" : "Drop files here or click to browse"}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          Images · Fonts · Color palettes (JSON/CSS) · Excel · Word · PDF
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {CATEGORIES.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              padding: "5px 13px",
              borderRadius: "999px",
              border: `1.5px solid ${filter === id ? "var(--ink)" : "var(--border)"}`,
              background: filter === id ? "var(--ink)" : "transparent",
              color: filter === id ? "var(--cream)" : "var(--text-dim)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              fontWeight: filter === id ? 600 : 400,
              transition: "all 0.1s",
            }}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "0.9375rem" }}>
          No assets yet. Upload something above.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="card"
              style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {/* Preview */}
              {asset.category === "image" ? (
                <div style={{ height: "80px", borderRadius: "8px", overflow: "hidden", background: "var(--bg-elev2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ height: "80px", borderRadius: "8px", background: "var(--bg-elev2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                  {CATEGORIES.find((c) => c.id === asset.category)?.emoji ?? "📄"}
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)", wordBreak: "break-all", lineHeight: 1.3 }}>
                  {asset.name}
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "5px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.6875rem", background: "var(--bg-elev3)", padding: "2px 7px", borderRadius: "999px", color: "var(--text-dim)" }}>
                    {asset.category}
                  </span>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                    {formatBytes(asset.size)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => copyUrl(asset.url, asset.id)}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: "8px", border: "1.5px solid var(--border)",
                    background: copied === asset.id ? "var(--yerba-soft)" : "var(--bg-elev)",
                    color: copied === asset.id ? "var(--yerba)" : "var(--text-dim)",
                    fontSize: "0.75rem", cursor: "pointer", fontWeight: 500, transition: "all 0.1s",
                  }}
                >
                  {copied === asset.id ? "Copied!" : "Copy URL"}
                </button>
                <button
                  onClick={() => remove(asset.id)}
                  style={{
                    padding: "5px 10px", borderRadius: "8px", border: "1.5px solid var(--border)",
                    background: "transparent", color: "var(--text-muted)", fontSize: "0.75rem",
                    cursor: "pointer", transition: "all 0.1s",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
