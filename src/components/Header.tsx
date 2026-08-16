export default function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-8">
      <h1 className="text-lg font-semibold text-zinc-900">Dashboard</h1>
      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500">
        QAGuard AI <span aria-hidden="true" className="mx-1.5 text-zinc-300">|</span> AI Test Intelligence
      </span>
    </header>
  );
}
