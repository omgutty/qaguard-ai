"use client";

// Circular score ring — the primary score visualization.
// Animates to its value on mount; no external deps.

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/primitives";

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-300";
  return "text-red-400";
}

function strokeFor(score: number): string {
  if (score >= 80) return "stroke-emerald-400";
  if (score >= 60) return "stroke-amber-300";
  return "stroke-red-400";
}

export function ScoreRing({
  value,
  size = 96,
  stroke = 8,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 600;
    const from = 0;
    const to = clamped;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [clamped]);

  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (display / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cx("transition-[stroke-dashoffset] duration-100 ease-out", strokeFor(clamped))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cx("font-mono text-2xl font-bold tabular-nums", scoreTone(clamped))}>
            {display}
          </span>
          {sublabel && <span className="text-[10px] uppercase tracking-wider text-text-muted">{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </div>
  );
}
