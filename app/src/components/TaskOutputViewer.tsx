"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { parseSubtaskOutput } from "@/lib/output-parser";
import type { SubtaskArtifact } from "@/lib/types";

// ─── Nomos brutalist code theme ──────────────────────────────────────────────

const nomosCodeStyle: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: "#1F1F1E",
    background: "#FFFDF7",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.85em",
    lineHeight: 1.5,
  },
  'pre[class*="language-"]': {
    color: "#1F1F1E",
    background: "#FFFDF7",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1.5px solid #1F1F1E",
    boxShadow: "3px 3px 0 #1F1F1E",
    overflowX: "auto" as const,
    margin: "0",
  },
  comment: { color: "#1F1F1E", opacity: 0.5, fontStyle: "italic" },
  string: { color: "#33B061" },
  keyword: { color: "#D97FBE" },
  function: { color: "#4A9FD8" },
  number: { color: "#D97FBE" },
  operator: { color: "#1F1F1E" },
  punctuation: { color: "#1F1F1E", opacity: 0.6 },
};

// ─── Inline styles for markdown prose ────────────────────────────────────────

const proseStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "var(--text)",
  lineHeight: 1.65,
};

// ─── Shared markdown components (react-markdown v9 API) ──────────────────────

// Override `pre` to a passthrough so SyntaxHighlighter renders its own container
// without double-wrapping inside an extra <pre>.
function PrePassthrough({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function CodeBlock({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"code">) {
  const match = /language-(\w+)/.exec(className ?? "");
  if (match) {
    return (
      <SyntaxHighlighter language={match[1]} style={nomosCodeStyle} PreTag="div">
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
  }
  return (
    <code
      className={className}
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "0.82em",
        background: "var(--bg-elev2)",
        padding: "1px 5px",
        borderRadius: "4px",
        border: "1px solid var(--border)",
      }}
      {...props}
    >
      {children}
    </code>
  );
}

const markdownComponents = {
  pre: PrePassthrough,
  code: CodeBlock,
} as Parameters<typeof ReactMarkdown>[0]["components"];

// ─── Artifact section label ───────────────────────────────────────────────────

function ArtifactLabel({ title, badge }: { title: string; badge?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "6px",
      }}
    >
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)" }}>
        {title}
      </span>
      {badge && (
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            background: "var(--bg-elev2)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "1px 6px",
            color: "var(--text-muted)",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Language guess from file extension ──────────────────────────────────────

function guessLang(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    cs: "csharp", cpp: "cpp", c: "c", sh: "bash", bash: "bash",
    zsh: "bash", sql: "sql", json: "json", yaml: "yaml", yml: "yaml",
    toml: "toml", md: "markdown", html: "html", css: "css",
  };
  return map[ext] ?? "text";
}

// ─── Artifact renderers ───────────────────────────────────────────────────────

function ArtifactBlock({ artifact }: { artifact: SubtaskArtifact }) {
  const containerStyle: React.CSSProperties = {
    border: "1.5px solid var(--ink)",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "var(--bg-elev)",
  };

  if (artifact.type === "code") {
    return (
      <div style={containerStyle}>
        <ArtifactLabel title={artifact.title} badge={artifact.language} />
        <SyntaxHighlighter language={artifact.language} style={nomosCodeStyle} PreTag="div">
          {artifact.content}
        </SyntaxHighlighter>
      </div>
    );
  }

  if (artifact.type === "file") {
    return (
      <div style={containerStyle}>
        <ArtifactLabel title={artifact.title} badge={artifact.filename} />
        <SyntaxHighlighter language={guessLang(artifact.filename)} style={nomosCodeStyle} PreTag="div">
          {artifact.content}
        </SyntaxHighlighter>
      </div>
    );
  }

  if (artifact.type === "link") {
    return (
      <div style={{ ...containerStyle, display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ink)" }}>
          {artifact.title}
        </span>
        <a
          href={artifact.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.75rem",
            color: "var(--tier-sonnet)",
            textDecoration: "none",
            fontFamily: "JetBrains Mono, monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {artifact.url}
        </a>
        {artifact.description && (
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            {artifact.description}
          </span>
        )}
      </div>
    );
  }

  if (artifact.type === "table") {
    return (
      <div style={containerStyle}>
        <ArtifactLabel title={artifact.title} />
        <div className="task-output">
          <table>
            <thead>
              <tr>
                {artifact.columns.map((col, i) => (
                  <th key={i}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {artifact.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (artifact.type === "quote") {
    return (
      <div
        style={{
          ...containerStyle,
          borderLeft: "4px solid var(--ink)",
          background: "var(--bg-elev2)",
        }}
      >
        {artifact.title && (
          <ArtifactLabel title={artifact.title} />
        )}
        <blockquote
          style={{
            margin: 0,
            fontSize: "0.8125rem",
            color: "var(--text)",
            lineHeight: 1.6,
            fontStyle: "italic",
          }}
        >
          {artifact.content}
        </blockquote>
        {artifact.source && (
          <div
            style={{
              marginTop: "6px",
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            — {artifact.source}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TaskOutputViewer({ rawOutput }: { rawOutput: string | undefined }) {
  if (!rawOutput) {
    return (
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
        No output yet.
      </div>
    );
  }

  const parsed = parseSubtaskOutput(rawOutput);

  if (parsed.kind === "raw") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span className="pill-neo" style={{ alignSelf: "flex-start" }}>
          raw output
        </span>
        <div className="task-output" style={proseStyle}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {parsed.text}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  const { data } = parsed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Summary */}
      <div
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "var(--ink)",
          lineHeight: 1.45,
        }}
      >
        {data.summary}
      </div>

      {/* Body */}
      <div className="task-output" style={proseStyle}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {data.body_markdown}
        </ReactMarkdown>
      </div>

      {/* Artifacts */}
      {data.artifacts && data.artifacts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.artifacts.map((a, i) => (
            <ArtifactBlock key={i} artifact={a} />
          ))}
        </div>
      )}

      {/* Next steps */}
      {data.next_steps && data.next_steps.length > 0 && (
        <div
          style={{
            border: "1.5px solid var(--border)",
            borderRadius: "10px",
            padding: "10px 14px",
            background: "var(--terere-soft)",
          }}
        >
          <div
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--ink)",
              marginBottom: "6px",
            }}
          >
            Next steps
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {data.next_steps.map((s, i) => (
              <li key={i} style={{ fontSize: "0.8125rem", color: "var(--text)", lineHeight: 1.5 }}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
