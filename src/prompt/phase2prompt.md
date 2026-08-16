We are now starting PHASE 2 of QAGuard AI.

IMPORTANT:
Phase 1 is complete and verified.
Do NOT redesign the existing UI.
Do NOT modify the existing workflow.
Do NOT implement the Requirement Agent yet.
This step is ONLY for establishing the secure OpenRouter AI provider layer.

==================================================
PROJECT
==================================================

Project:
QAGuard AI

Tagline:
AI-Powered Test Intelligence & Governance

Current V1 workflow:

Requirement Analysis
→ Test Generation
→ Test Data
→ Human Review
→ Playwright Generation
→ AI Quality / Traceability Dashboard

Technology:

- Next.js
- TypeScript
- Tailwind CSS
- Next.js App Router
- Vercel
- GitHub

AI provider:

OpenRouter

Default model:

deepseek/deepseek-v4-flash

==================================================
SECURITY REQUIREMENTS
==================================================

The OpenRouter API key is a SECRET.

NEVER expose the API key to the browser.

NEVER put the API key in:

- React components
- client-side code
- public files
- source code
- Git
- README
- URL query parameters
- request bodies originating from the browser

The API key must only be accessed from server-side code.

Use:

OPENROUTER_API_KEY

The model must be configurable using:

OPENROUTER_MODEL

Default value:

deepseek/deepseek-v4-flash

==================================================
ENVIRONMENT CONFIGURATION
==================================================

Create/update:

.env.local.example

with:

OPENROUTER_API_KEY=
OPENROUTER_MODEL=deepseek/deepseek-v4-flash

Verify that .env.local is ignored by Git.

If .gitignore does not already contain .env.local, add it.

Do NOT create a real .env.local containing a key.

Do NOT ask me to paste my API key into source code.

I will create .env.local myself after the implementation.

==================================================
AI PROVIDER ARCHITECTURE
==================================================

Create a server-side AI provider abstraction.

Use:

src/lib/ai/

Create a suitable provider module, for example:

src/lib/ai/openrouter.ts

and supporting types/utilities if necessary.

The provider should expose a clean server-side function such as:

generateStructuredResponse()

or an equivalent well-designed interface.

The exact function signature is your engineering decision, but keep it simple and reusable.

The provider should:

1. Read OPENROUTER_API_KEY from server environment variables.
2. Read OPENROUTER_MODEL from server environment variables.
3. Default the model to:

deepseek/deepseek-v4-flash

4. Call OpenRouter from SERVER-SIDE code only.
5. Send system and user messages.
6. Request a structured JSON response where supported.
7. Parse the response safely.
8. Handle HTTP/API errors cleanly.
9. Never expose the API key in errors or logs.
10. Return a typed result or throw a controlled server-side error.

==================================================
OPENROUTER API
==================================================

Use the official OpenRouter API endpoint.

Do not create a browser-side fetch call.

The implementation should support headers required by OpenRouter.

Use the environment variable model rather than hard-coding the model throughout the code.

The architecture should allow us to change models later without changing the agents.

==================================================
STRUCTURED OUTPUT
==================================================

Our agents will require reliable JSON because QAGuard uses TypeScript data contracts.

Design the provider so structured JSON responses can be requested.

Do not create a huge generic framework.

Keep the abstraction focused on the needs of QAGuard.

The provider should be reusable by:

- Requirement Agent
- Test Engine Agent
- Test Data Agent
- Automation Agent
- Quality Agent

later.

==================================================
SERVER-SIDE BOUNDARY
==================================================

Make the server/client boundary explicit.

The OpenRouter provider MUST NOT be imported into:

- page.tsx
- client components
- browser-side hooks
- client-side context

The browser should communicate with Next.js server-side functionality.

Do not expose environment variables prefixed with:

NEXT_PUBLIC_

for the API key.

==================================================
ERROR HANDLING
==================================================

Create clear error handling for:

- Missing OPENROUTER_API_KEY
- Invalid API key
- OpenRouter HTTP errors
- Empty model response
- Invalid JSON response
- Network/request failure
- Rate limit errors

Do not expose raw provider errors to end users.

Do not log secrets.

Errors should be useful for server-side debugging without revealing the API key.

==================================================
DEPENDENCIES
==================================================

Before installing anything, inspect package.json.

Do NOT install unnecessary packages.

Prefer native fetch if it is sufficient.

Do not add an AI SDK abstraction library unless genuinely required.

Do not add:

- LangChain
- Langflow
- n8n
- MCP
- database
- vector database

at this stage.

==================================================
TESTABILITY
==================================================

Create a small server-side test or validation mechanism if appropriate to verify:

- missing API key is handled
- configuration is loaded correctly
- model defaults correctly
- provider module compiles

Do NOT create an endpoint that exposes the API key.

Do NOT create a public "show API configuration" endpoint.

Do NOT make an actual OpenRouter request unless an API key already exists in .env.local.

==================================================
EXISTING ARCHITECTURE
==================================================

Preserve the existing:

src/agents/
src/components/
src/lib/
src/types/
src/app/

Do not remove the existing mock agents.

Phase 1 must continue working.

The mock Requirement Agent and other mock agents should remain available until we explicitly replace them.

==================================================
VERIFICATION
==================================================

After implementation:

1. Run:

npm run lint

2. Run:

npm run build

3. Verify no TypeScript errors.

4. Verify .env.local is ignored by Git.

5. Verify no API key exists anywhere in tracked source files.

6. Verify the existing application still works at localhost:3000.

7. Verify no client component imports the OpenRouter provider.

Do not call the actual OpenRouter API unless the environment contains OPENROUTER_API_KEY.

==================================================
GIT
==================================================

Do NOT create a Git commit.

At the end report:

1. Files created/modified.
2. OpenRouter provider architecture.
3. Environment variable setup.
4. Security checks.
5. Dependencies added, if any.
6. npm run lint result.
7. npm run build result.
8. Whether an actual OpenRouter request was performed.
9. Any issues or decisions.

STOP after completing this step.

DO NOT implement the Requirement Agent yet.
DO NOT implement real AI analysis yet.
DO NOT modify the other agents.
DO NOT proceed to Phase 2 Step 2.