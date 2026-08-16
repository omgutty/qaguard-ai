import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="flex flex-1 bg-zinc-50 font-sans">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-12">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">
                Welcome to QAGuard AI
              </h2>
              <p className="mt-2 text-base text-zinc-600">
                Transform requirements into reliable, traceable tests.
              </p>
            </div>
            <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <label
                htmlFor="requirement-input"
                className="mb-3 block text-sm font-medium text-zinc-700"
              >
                Requirement
              </label>
              <textarea
                id="requirement-input"
                rows={8}
                placeholder="Paste your user story or requirement here..."
                className="w-full resize-y rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Analyze Requirement
                </button>
                <span className="text-xs text-zinc-400">
                  AI analysis is coming soon.
                </span>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
