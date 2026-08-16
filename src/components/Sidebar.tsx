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
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-zinc-950/80">
      <div className="flex h-14 items-center border-b border-white/[0.06] px-5">
        <div>
          <p className="text-[15px] font-bold leading-tight text-white">
            QAGuard <span className="text-indigo-400">AI</span>
          </p>
          <p className="text-[11px] font-medium text-zinc-500">
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
                  ? "bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-400/20"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              )}
            >
              <span
                className={cx(
                  "h-1.5 w-1.5 rounded-full",
                  active ? "bg-indigo-400" : "bg-zinc-700"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/[0.06] p-4">
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Nothing ships to automation without human approval.
        </p>
      </div>
    </aside>
  );
}
