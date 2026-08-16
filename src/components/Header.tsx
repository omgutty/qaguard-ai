"use client";

// Page header showing the current route title, a Phase indicator, and the
// global theme toggle. Uses the pathname to stay in sync with client-side
// navigation without prop drilling.

import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
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
  const { theme, toggleTheme } = useTheme();
  const title = titles[pathname] ?? "QAGuard AI";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-6">
      <h1 className="text-[15px] font-semibold tracking-tight text-text-primary">
        {title}
      </h1>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] font-medium text-text-secondary sm:inline-flex">
          <span className={cx("h-1.5 w-1.5 rounded-full bg-success")} />
          Phase 2 · Real AI
        </span>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          {theme === "dark" ? (
            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
          <span>{theme === "dark" ? "Dark" : "Light"}</span>
        </button>
      </div>
    </header>
  );
}
