# 🛡️ QAGuard AI

**AI-Powered Test Intelligence & Governance**

QAGuard AI turns raw software requirements into traceable, reviewable, audit-ready test artifacts — analysis → test cases → test data → human sign-off → automation → quality proof. **Nothing ships to automation without a human approving it.**

---

## Problem Statement

Most QA teams generate test artifacts manually, with little traceability between a requirement and the tests that verify it. When a requirement changes, nobody knows which tests are affected. When automation is written, nobody can prove it covers the approved acceptance criteria.

QAGuard AI closes that loop with a governed, human-in-the-middle pipeline.

## Solution

A guided workflow that derives a requirement's analysis, test cases, test data, and automation candidates — and requires human approval before anything is automated. Every artifact carries traceability back to the requirement, and a quality dashboard proves coverage in one screen.

## V1 Workflow (fixed)

```
Requirement Analysis → Test Generation → Test Data → Human Review
        → Playwright Generation → AI Quality / Traceability Dashboard
```

## Features

- **Requirement Analysis** — deterministic scores (Completeness / Clarity / Testability / Overall), gaps, risks, and recommendations derived from the actual requirement text
- **Test Generation** — typed test cases (positive, negative, boundary, validation, security, regression) each with source traceability (acceptance criterion or AI-derived)
- **Test Data** — realistic datasets per test case, with sensitive values masked and a reveal toggle; generated vs. edited badges
- **Human Review** — the governance gate: approve / reject / edit each test case. Unapproved cases cannot be automated
- **Automation** — Playwright TypeScript generated only for approved test cases, with copy + download
- **Quality & Traceability Dashboard** — overall quality score, coverage metrics, AI confidence, and a live pipeline flow with counts at every stage
- **Dark/Light theme** — enterprise dark theme by default with a global light-mode toggle (persisted via localStorage, no page reload)
- **Dark, data-dense UI** — score rings, monospace IDs, status color grammar, first-class empty/error states
- **Session persistence** — shared client state survives navigation (no database in Phase 1)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict, no `any`) |
| Styling | Tailwind CSS v4 |
| State | React Context (`WorkflowProvider`) |
| Deploy | Vercel / GitHub |

## Project Structure

```
src/
├── agents/                  # Deterministic mock AI agents (Phase 1)
│   ├── requirement-agent.ts #   analyzeRequirement()
│   ├── test-engine-agent.ts #   generateTestCases()
│   ├── test-data-agent.ts   #   generateTestData()
│   ├── automation-agent.ts  #   generateAutomation()
│   └── quality-agent.ts     #   generateQualityReport()
├── app/                     # App Router routes
│   ├── page.tsx             #   Dashboard (/)
│   ├── requirements/        #   Requirement entry + analysis
│   ├── test-cases/          #   Generated test cases
│   ├── test-data/           #   Generated test data
│   ├── review/              #   Human review / governance gate
│   ├── automation/          #   Playwright generation
│   └── quality/             #   Quality & traceability dashboard
├── components/              # Shared UI (Sidebar, Header, ui/*, ThemeProvider)
├── lib/
│   ├── ai/                  # OpenRouter provider (server-only, Phase 2 boundary)
│   ├── state/               # WorkflowProvider (client state)
│   ├── utils/               # Traceability + scoring helpers
│   └── validation/          # Input validation
└── types/
    └── qa.ts                # Data contracts (strict, union types)
```

## How to Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run lint       # ESLint
npm run build      # Production build + typecheck
npm run verify:ai  # Verify the OpenRouter provider config/errors (no API call)
```

## Current Phase

> **Phase 1 uses deterministic mock AI responses.** Real LLM integration will be added in Phase 2.

Every "AI" output is a real TypeScript function that inspects the actual input and computes a believable result — no hardcoded copy-paste, no network calls, no API keys required.

## Future AI Integration (Phase 2)

The agent layer is designed so mock internals can be swapped for real LLM calls **without changing any public function signature**:

```
requirement-agent.ts   → analyzeRequirement()
test-engine-agent.ts   → generateTestCases()
test-data-agent.ts     → generateTestData()
automation-agent.ts    → generateAutomation()
quality-agent.ts       → generateQualityReport()
```

Phase 2 will add an LLM provider behind `src/lib/ai/` with the same contract. No Langflow, no n8n, no MCP, no RAG, no database in Phase 1.

## OpenRouter Provider (Phase 2 foundation)

A server-only provider abstraction exists at `src/lib/ai/`:

- `openrouter.ts` — `generateStructuredResponse()` calling the OpenRouter chat completions API with `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` (default `deepseek/deepseek-v4-flash`), structured JSON support, and typed error handling
- `types.ts` — OpenRouter request/response types
- The barrel (`index.ts`) imports `server-only`, so importing it into any client component fails the build

The API key is never exposed to the browser. Copy `.env.local.example` to `.env.local` and add your key when ready. The current agents remain deterministic mocks until Phase 2 Step 2 wires them to this provider.

## Deployment

The project is Vercel-ready: static prerendering, no env vars required, no build-time secrets. Connect the repository to Vercel and it deploys as-is.
