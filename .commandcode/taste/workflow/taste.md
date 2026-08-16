# Taste

## Project structure
- Avoids creating empty/over-engineered folder structures ahead of need — explicitly said "don't create these folders manually yet; we'll create them when we actually need them" to prevent empty scaffolding. Creates folders/files only when actually needed. Confidence: 0.95

## Development process
- Prefers milestone-based incremental delivery: get a small working, verifiable slice done first (e.g., static UI), verify it, checkpoint, deploy, and only then layer in complexity (agents, AI, APIs). Confidence: 0.95
- Wants meaningful git checkpoints at verified milestones ("first meaningful commit"), not premature or trivial commits. Confidence: 0.85
- Likes to keep the dev server (`npm run dev`) running throughout development and wants the assistant to leave it running. Confidence: 0.7
- Wants strict scope discipline: no unrequested technologies (explicitly no Langflow, n8n, MCP, database), no unnecessary package installs, no future-stage logic (e.g., AI) before its step, and no advancing to the next feature until asked ("For this step ONLY" / "Do not proceed to the next feature"). Prefers minimal placeholder stubs to keep TypeScript clean over speculative implementation. Confidence: 0.9
- Prefers existing working UI/code to be left untouched unless the current task requires changes ("DO NOT redesign or remove the existing UI"). Confidence: 0.85
- Wants post-change verification: run the project's lint and TypeScript/build checks, ensure zero errors, and show the created files plus verification results. Confidence: 0.8
