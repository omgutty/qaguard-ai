import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Requirements", href: "/requirements" },
  { label: "Test Cases", href: "/test-cases" },
  { label: "Test Data", href: "/test-data" },
  { label: "Automation", href: "/automation" },
  { label: "Quality", href: "/quality" },
];

export default function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex h-16 items-center border-b border-zinc-200 px-6">
        <div>
          <p className="text-base font-bold leading-tight text-zinc-900">
            QAGuard AI
          </p>
          <p className="text-xs font-medium text-zinc-500">
            AI Test Intelligence
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = item.href === "/";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "block rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                  : "block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
