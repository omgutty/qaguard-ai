"use client";

// Page header showing the current route title. Uses the pathname to stay in
// sync with client-side navigation without prop drilling.

import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/primitives";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/requirements": "Requirements",
  "/test-cases": "Test Cases",
  "/test-data": "Test Data",
  "/review": "Human Review",
  "/automation": "Automation",
  "/quality": "Quality & Traceability",
};

export default function Header() {
  const pathname = usePathname();
  const title = titles[pathname] ?? "QAGuard AI";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-zinc-950/60 px-6 backdrop-blur">
      <h1 className="text-[15px] font-semibold tracking-tight text-white">
        {title}
      </h1>
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] font-medium text-zinc-400">
        <span className={cx("h-1.5 w-1.5 rounded-full bg-emerald-400")} />
        Phase 1 · Mock AI
      </span>
    </header>
  );
}
