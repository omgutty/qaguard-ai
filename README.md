# 🛡️ QAGuard AI

**AI-Powered Test Intelligence & Governance**

QAGuard AI turns raw software requirements into traceable, reviewable, audit-ready test artifacts — analysis → test cases → test data → human sign-off → automation → quality proof. **Nothing ships to automation without a human approving it.**

---

## Problem Statement

Most QA teams generate test artifacts manually, with little traceability between a requirement and the tests that verify it. When a requirement changes, nobody knows which tests are affected. When automation is written, nobody can prove it covers the approved acceptance criteria.

QAGuard AI closes that loop with a governed, human-in-the-middle pipeline.

## Solution

A guided workflow that derives a requirement's analysis, test cases, test data, and automation candidates — and requires **human approval before anything is automated**. Every artifact carries traceability back to the requirement, and a quality dashboard proves coverage in one screen.

The pipeline is powered by a real LLM (OpenRouter → DeepSeek V4 Flash) for requirement analysis and test case generation, with the remaining pipeline stages running on deterministic mock agents.

## Live Demo

- **Deployed app:** [https://qaguard-ai.vercel.app](https://qaguard-ai.vercel.app)
- **Source code:** [https://github.com/omgutty/qaguard-ai](https://github.com/omgutty/qaguard-ai)

## Screenshots

_Coming soon — add screenshots of the dashboard, requirement analysis, test cases, and quality pages here._

---

## V1 Workflow

The fixed end-to-end workflow:

```
Requirement Analysis → Test Generation → Test Data → Human Review
        → Playwright Generation → AI Quality / Traceability Dashboard
```

## What Was Built — V1 (Application Shell & Mock Pipeline)

Phase 1 delivered the complete working application shell running entirely on **deterministic mock AI logic** (no LLM, no network calls):

- **Requirement Analysis (mock)** — deterministic scores (Completeness / Clarity / Testability / Overall), gaps, risks, and recommendations derived from the actual requirement text
- **Test Generation (mock)** — typed test cases (positive, negative, boundary, validation, security, regression) each with source traceability (acceptance criterion or AI-derived)
- **Test Data** — realistic datasets per test case, with sensitive values masked and a reveal toggle; generated vs. edited badges
- **Human Review** — the governance gate: approve / reject / edit each test case. Unapproved cases cannot be automated
- **Automation** — Playwright TypeScript generated only for approved test cases, with copy + download
- **Quality & Traceability Dashboard** — overall quality score, coverage metrics, AI confidence, and a live pipeline flow with counts at every stage
- **Dark/Light theme** — enterprise dark theme by default with a global light-mode toggle (persisted via localStorage, no page reload)
- **Session persistence** — shared client state survives navigation (no database)

## What Was Built — V2 (Real AI Integration)

Phase 2 replaced the mock internals with a **real LLM** through a secure, server-only OpenRouter provider:

### Secure OpenRouter Provider
- Server-only abstraction at `src/lib/ai/openrouter.ts` — `generateStructuredResponse()` calls the OpenRouter chat completions API
- Reads `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` from server environment variables (default model: `deepseek/deepseek-v4-flash`)
- Structured JSON responses, typed error handling (missing/invalid key, rate limit, empty response, invalid JSON, network failure)
- The barrel (`src/lib/ai/index.ts`) imports `server-only`, so importing it into any client component fails the build
- The API key is never exposed to the browser, logs, or API responses

### Real Requirement Agent
- `analyzeRequirement()` now calls the real LLM and returns a validated `RequirementAnalysis`
- Grounding rules enforce that the model uses **only** the supplied requirement as factual evidence — no invented business rules, UI, or behavior
- Scores (completeness / clarity / testability / overall) are justified by the requirement, not random
- Response validated field-by-field before it reaches the UI (`src/lib/validation/analysis.ts`)

### Real Test Engine Agent
- `generateTestCases()` now calls the real LLM and returns validated, typed `TestCase[]`
- Generates meaningful coverage (positive, negative, boundary, validation, security, regression) grounded in the requirement + analysis
- Every test case carries traceability (`requirementId`, source = `Acceptance Criteria #N` or `AI-Derived`)
- Response validated field-by-field (`src/lib/validation/test-cases.ts`) — malformed output is rejected, never silently repaired

### Server-Side API Routes
- `POST /api/requirements/analyze` — requirement input → Requirement Agent → validated `RequirementAnalysis`
- `POST /api/test-cases/generate` — requirement + analysis → Test Engine Agent → validated `TestCase[]` (plus downstream mock test data & quality report)
- The browser only talks to these routes; OpenRouter is never called from client code
- Safe, user-friendly error messages (no API keys, URLs, or stack traces)

### Human Review Compatibility
- The governance gate is unchanged: reviewers still approve / reject / edit test cases, and only approved cases proceed to automation (Automation Agent is a later step)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict, no `any`) |
| Styling | Tailwind CSS v4 |
| State | React Context (`WorkflowProvider`) |
| Theme | Custom dark/light tokens + `useSyncExternalStore` (no theme library) |
| AI Provider | OpenRouter |
| LLM Model | DeepSeek V4 Flash (`deepseek/deepseek-v4-flash`) |
| Deploy | Vercel / GitHub |

## How to Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**AI requires an API key.** Create `.env.local` from the example:

```bash
cp .env.local.example .env.local
```

Then add your OpenRouter key:

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
```

Useful scripts:

```bash
npm run lint          # ESLint
npm run build         # Production build + typecheck
npm run verify:ai     # Verify OpenRouter provider config (no API call)
npm run verify:agent  # Verify Requirement Agent validation/errors (no API call)
npm run verify:engine # Verify Test Engine Agent validation/errors (no API call)
```

## Project Structure

```
src/
├── agents/                        # Agents (real LLM + preserved mocks)
│   ├── requirement-agent.ts       #   analyzeRequirement() — real LLM
│   ├── requirement-agent.mock.ts  #   Phase 1 deterministic mock
│   ├── test-engine-agent.ts       #   generateTestCases() — real LLM
│   ├── test-engine-agent.mock.ts  #   Phase 1 deterministic mock
│   ├── test-data-agent.ts         #   generateTestData() — mock
│   ├── automation-agent.ts        #   generateAutomation() — mock
│   └── quality-agent.ts           #   generateQualityReport() — mock
├── app/                           # App Router routes + API
│   ├── page.tsx                   #   Dashboard (/)
│   ├── requirements/              #   Requirement entry + analysis
│   ├── test-cases/                #   Generated test cases
│   ├── test-data/                 #   Generated test data
│   ├── review/                    #   Human review / governance gate
│   ├── automation/                #   Playwright generation
│   ├── quality/                   #   Quality & traceability dashboard
│   └── api/
│       ├── requirements/analyze/  #   POST — Requirement Agent
│       └── test-cases/generate/   #   POST — Test Engine Agent
├── components/                    # Shared UI (Sidebar, Header, ui/*, ThemeProvider)
├── lib/
│   ├── ai/                        # OpenRouter provider (server-only)
│   ├── state/                     # WorkflowProvider (client state)
│   ├── utils/                     # Traceability + scoring helpers
│   └── validation/                # analysis.ts, test-cases.ts, requirement.ts
└── types/
    └── qa.ts                      # Data contracts (strict, union types)
```

## Security

- `OPENROUTER_API_KEY` lives only in server-side environment variables (`.env.local`, gitignored)
- No `NEXT_PUBLIC_` key exposure — the browser never sees the key
- The OpenRouter provider is server-only; client components cannot import it
- LLM output is validated server-side before reaching the UI
- Errors returned to users are sanitized (no keys, URLs, or stack traces)

## Deployment

The project is Vercel-ready. Set the environment variables in the Vercel dashboard:

```
OPENROUTER_API_KEY=<your key>
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
```

Live demo: [https://qaguard-ai.vercel.app](https://qaguard-ai.vercel.app)
