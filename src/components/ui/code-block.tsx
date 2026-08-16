"use client";

// Minimal syntax-highlighted code viewer (no external deps).
// Highlights comments and string literals; everything else is plain.

import { useState } from "react";

function highlight(code: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\/\/[^\n]*|"[^"\n]*"|'[^'\n]*')/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(code)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={key++}>{code.slice(last, match.index)}</span>);
    }
    const token = match[0];
    if (token.startsWith("//")) {
      nodes.push(
        <span key={key++} className="text-text-muted">
          {token}
        </span>
      );
    } else {
      nodes.push(
        <span key={key++} className="text-emerald-300">
          {token}
        </span>
      );
    }
    last = match.index + token.length;
  }
  if (last < code.length) {
    nodes.push(<span key={key++}>{code.slice(last)}</span>);
  }
  return nodes;
}

export function CodeBlock({
  code,
  fileName,
  onCopy,
}: {
  code: string;
  fileName?: string;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable; keep button stable.
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-code-bg">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          </span>
          {fileName && (
            <span className="ml-2 font-mono text-xs text-text-muted">{fileName}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-text-primary">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}
