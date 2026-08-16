"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/primitives";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Requirements", href: "/requirements" },
  { label: "Test Cases", href: "/test-cases" },
  { label: "Test Data", href: "/test-data" },
  { label: "Review", href: "/review" },
  { label: "Automation", href: "/automation" },
  { label: "Quality", href: "/quality" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center border-b border-border px-5">
        <div>
          <p className="text-[15px] font-bold leading-tight text-text-primary">
            QAGuard <span className="text-accent">AI</span>
          </p>
          <p className="text-[11px] font-medium text-text-muted">
            Test Intelligence & Governance
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/15 text-white ring-1 ring-inset ring-accent/40"
                  : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-[11px] leading-relaxed text-text-muted">
          Nothing ships to automation without human approval.
        </p>
      </div>
    </aside>
  );
}
