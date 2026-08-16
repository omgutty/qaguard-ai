# Taste

## Project structure
- Avoids creating empty/over-engineered folder structures ahead of need — explicitly said "don't create these folders manually yet; we'll create them when we actually need them" to prevent empty scaffolding. Creates folders/files only when actually needed. Confidence: 0.95

## Development process
- Prefers milestone-based incremental delivery: get a small working, verifiable slice done first (e.g., static UI), verify it, checkpoint, deploy, and only then layer in complexity (agents, AI, APIs). Confidence: 0.95
- Wants meaningful git checkpoints at verified milestones ("first meaningful commit"), not premature or trivial commits. Confidence: 0.85
- Likes to keep the dev server (`npm run dev`) running throughout development and wants the assistant to leave it running. Confidence: 0.7
- Wants strict scope discipline: no unrequested technologies (explicitly no Langflow, n8n, MCP, RAG, database, Docker, Redis, Kafka, or Redux/state libraries), no unnecessary package installs, no future-stage logic (e.g., real LLM integration in Phase 1) before its step, and no advancing to the next feature/phase until asked ("For this step ONLY" / "Do not proceed to the next feature" / "Stop once Phase 1 is complete"). Prefers minimal placeholder stubs to keep TypeScript clean over speculative implementation. Confidence: 0.95
- Prefers existing working UI/code to be left untouched unless the current task requires changes ("DO NOT redesign or remove the existing UI"). Confidence: 0.85
- Wants post-change verification: run the project's lint and TypeScript/build checks, ensure zero errors (explicitly "no unresolved warnings caused by your own code"), verify routes/manual flows, and show the created files plus verification results. Confidence: 0.85
- Wants mock/"AI" layers built as deterministic functions that derive believable results from actual input (never hardcoded or random), architected with stable public function signatures so internals can be swapped for real LLM calls later without changing the API. Confidence: 0.9
- Wants strict TypeScript data contracts: zero `any`, union types for controlled vocabularies (statuses, types, priorities), modeled only for the current phase with no speculative fields, and reusable cross-cutting logic centralized in shared lib helpers rather than duplicated per screen. Confidence: 0.85
- Wants explicit governance/business-rule enforcement in logic, not just UI copy (e.g., unapproved test cases cannot reach automation) and no fake claims — README and UI must state clearly when functionality is mocked vs real ("Do not claim real AI functionality"). Confidence: 0.8
