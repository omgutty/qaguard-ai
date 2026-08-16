We are implementing PHASE 2 — STEP 2 of QAGuard AI.

IMPORTANT:
Phase 1 is complete.
Phase 2 Step 1 — secure OpenRouter provider — is complete and verified.

We are now implementing ONLY the REAL REQUIREMENT AGENT.

Do NOT implement:
- Test Engine Agent
- Test Data Agent
- Automation Agent
- Quality Agent
- RAG
- MCP
- Langflow
- n8n
- database
- authentication
- multi-user support

Do not redesign the application.

Do not replace the existing QAGuard data contracts unnecessarily.

==================================================
PROJECT
==================================================

QAGuard AI

AI-Powered Test Intelligence & Governance

V1 workflow:

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
- App Router
- Vercel
- OpenRouter
- DeepSeek V4 Flash

OpenRouter model:

deepseek/deepseek-v4-flash

The OpenRouter provider already exists at:

src/lib/ai/openrouter.ts

Do NOT recreate the provider.

Do NOT create another OpenRouter client.

Use the existing server-side provider abstraction.


==================================================
CURRENT REQUIREMENT AGENT
==================================================

The existing file:

src/agents/requirement-agent.ts

currently implements deterministic/mock behavior.

It exposes:

analyzeRequirement()

Replace the INTERNAL implementation with a real LLM implementation.

Preserve the existing public function contract as much as reasonably possible so the existing UI and workflow do not break.

The Requirement Agent must call the existing OpenRouter provider.

The Requirement Agent must remain SERVER-SIDE.


==================================================
CORE PRINCIPLE — REQUIREMENT GROUNDING
==================================================

QAGuard is a QA governance product.

The Requirement Agent must NOT treat assumptions as facts.

The primary source of truth is ONLY the user-provided requirement.

The model must distinguish between:

1. Explicitly stated information
2. Missing information
3. Risks/inferences
4. AI recommendations

Never present an AI assumption as if it came from the requirement.

Every gap, risk and recommendation should have appropriate source classification where supported by the existing types.

Use explicit source concepts such as:

- requirement
- acceptance_criteria
- ai_derived

Use the existing QAGuard TypeScript types where possible.


==================================================
INPUT
==================================================

The Requirement Agent receives a Requirement.

The Requirement contains information such as:

- id
- title
- description
- acceptanceCriteria

The complete requirement should be supplied to the model.

Do NOT silently add information that was not supplied by the user.


==================================================
OUTPUT
==================================================

The Requirement Agent must return the existing:

RequirementAnalysis

contract from:

src/types/qa.ts

Do NOT create an unrelated output interface.

The result should contain, according to the existing contract:

- requirementId
- completenessScore
- clarityScore
- testabilityScore
- overallScore
- gaps
- risks
- recommendations

Use the exact existing TypeScript contract as the source of truth.

Inspect the existing type definitions before implementing.


==================================================
LLM SYSTEM INSTRUCTIONS
==================================================

Create a strong system prompt specifically for QA requirement analysis.

The system prompt should instruct the model that it is:

A senior QA test architect and requirements analyst.

Its responsibility is to analyze the supplied software requirement for:

- completeness
- clarity
- testability
- ambiguity
- missing acceptance criteria
- missing business rules
- missing validation behavior
- missing error handling
- missing boundary conditions
- potential testing risks

The model must:

- use only the supplied requirement as factual evidence
- never invent business rules
- never invent expected behavior
- never invent UI elements
- never invent API behavior
- never invent test data requirements as facts
- explicitly identify missing information
- clearly distinguish recommendations from facts
- identify ambiguity rather than resolving it silently
- produce concise actionable QA analysis


==================================================
SCORING
==================================================

The model should return numeric scores:

Completeness:
0–100

Clarity:
0–100

Testability:
0–100

Overall:
0–100

The system prompt should clearly define the scoring philosophy.

For example:

Completeness:
Does the requirement contain enough information to understand expected behavior and important acceptance conditions?

Clarity:
Is the requirement unambiguous and understandable?

Testability:
Can a QA engineer derive objective test scenarios and expected results from the requirement?

Overall:
A balanced assessment of the three dimensions.

Do not ask the model to produce random or arbitrary scores.

Scores must be justified by the supplied requirement.


==================================================
GAPS
==================================================

A requirement gap is information needed for confident testing but missing from the supplied requirement.

Examples:

- Missing error message behavior
- Missing password policy
- Missing account lockout behavior
- Missing session timeout behavior

But ONLY report these as gaps if they are genuinely relevant to the supplied requirement.

Do not blindly add a generic list of QA concerns.

Each gap should contain the information required by the existing TypeScript contract.

Use the existing types.


==================================================
RISKS
==================================================

Identify realistic QA risks arising from the supplied requirement.

Examples:

- Ambiguous acceptance criteria
- Multiple possible interpretations
- Missing negative behavior
- Missing boundary behavior
- Security-sensitive behavior without defined rules

Again:

Do not invent requirements.

A risk can be identified because information is missing, but clearly state that it is a risk rather than an established requirement.


==================================================
RECOMMENDATIONS
==================================================

Recommendations are suggestions to improve the requirement or its testability.

They are NOT requirements.

Clearly mark them as AI-derived/recommendations according to the existing contract.

Examples:

"Specify the expected error message for invalid credentials."

"Define the maximum number of failed login attempts."

Do not write:

"The application must lock the account after 5 attempts."

unless the requirement explicitly states that behavior.


==================================================
STRUCTURED OUTPUT
==================================================

Use the existing OpenRouter provider's structured JSON capability.

The LLM response must conform to the RequirementAnalysis structure.

Do NOT depend on free-form markdown parsing.

Do NOT parse arbitrary prose using regular expressions.

The flow should be:

Requirement
↓
System Prompt
↓
User Requirement
↓
OpenRouter
↓
Structured JSON
↓
TypeScript validation
↓
RequirementAnalysis


==================================================
VALIDATION
==================================================

The LLM output is untrusted external data.

Validate the response before returning it to the application.

Use the existing validation architecture under:

src/lib/validation/

If a validation library is NOT already installed, do not automatically add a large dependency.

A lightweight TypeScript validation implementation is acceptable.

The following must be validated:

- required fields
- numeric scores
- scores between 0 and 100
- requirementId
- arrays
- gap structure
- risk structure
- recommendation structure

Reject malformed AI output rather than silently returning invalid data.


==================================================
SCORE SAFETY
==================================================

Do not allow:

- negative scores
- scores above 100
- NaN
- Infinity
- missing score values

If the model returns invalid values:

1. Validate.
2. Reject the response.
3. Return a controlled error.

Do not silently clamp bad model output unless the existing architecture explicitly requires it.


==================================================
ERROR HANDLING
==================================================

Handle:

- missing API key
- OpenRouter authentication failure
- rate limiting
- provider errors
- network failure
- empty model response
- malformed JSON
- invalid RequirementAnalysis
- unexpected provider response

Do not expose raw API errors to the user.

Do not expose API keys.

Use user-friendly errors at the UI layer.

Use useful but safe server-side diagnostics where appropriate.


==================================================
API / SERVER BOUNDARY
==================================================

The browser must NOT directly call OpenRouter.

The architecture must be:

Browser
↓
Next.js server-side route/action
↓
Requirement Agent
↓
OpenRouter
↓
DeepSeek V4 Flash

Inspect the current application architecture and choose the cleanest Next.js server-side mechanism.

A dedicated route such as:

app/api/requirements/analyze/route.ts

is acceptable and preferred if it fits the existing architecture.

The route should:

1. Accept the requirement.
2. Validate input.
3. Call analyzeRequirement().
4. Return typed JSON.
5. Return safe error responses.

Do not expose server secrets.


==================================================
UI INTEGRATION
==================================================

The existing Requirement page already contains:

- requirement input
- Analyze Requirement button
- analysis result area

Connect the existing UI to the new server-side Requirement Agent.

Do NOT redesign the page.

When the user clicks:

Analyze Requirement

the UI should:

1. Validate the requirement.
2. Show a loading state.
3. Call the Next.js server endpoint.
4. Wait for the real LLM response.
5. Display RequirementAnalysis.
6. Update the existing workflow state.
7. Handle errors cleanly.

The button should not be clickable repeatedly while a request is in progress.


==================================================
LOADING STATE
==================================================

Use a clear loading state such as:

Analyzing requirement...

Do not freeze the entire application.

Only the relevant action should show loading.


==================================================
ERROR UI
==================================================

If the LLM call fails, show a user-friendly message.

Examples:

"Unable to analyze the requirement. Please try again."

"AI service is temporarily unavailable."

Do not show:

- API key
- OpenRouter URL
- raw stack trace
- internal exception details


==================================================
MOCK AGENT
==================================================

Preserve the Phase 1 deterministic mock implementation in a clean way if useful for testing.

However, the normal production workflow should now use the REAL Requirement Agent.

Do not remove useful Phase 1 behavior unnecessarily.

If a test environment or fallback is needed, keep it explicit.

Do NOT silently fall back from real AI to mock AI.

A failed AI request should be a failure, not a fake successful analysis.


==================================================
MODEL CONFIGURATION
==================================================

Use:

OPENROUTER_MODEL

with default:

deepseek/deepseek-v4-flash

Do not hard-code the model into the agent.

The agent should use the existing OpenRouter provider configuration.


==================================================
PROMPT ENGINEERING
==================================================

Keep the Requirement Agent prompt separate from application logic.

Prefer a structure such as:

src/agents/requirement-agent.ts

containing:

- system prompt
- request construction
- provider call
- response validation
- return value

Do not create an enormous prompt framework.

Keep it readable and maintainable.

The prompt must be designed so that later we can version it.

For example:

REQUIREMENT_ANALYSIS_PROMPT_VERSION = "1.0"


==================================================
TOKEN / COST AWARENESS
==================================================

Do not implement full token tracking yet.

However, structure the provider call so we can later capture:

- model
- input tokens
- output tokens
- total tokens
- estimated cost

Do not build a dashboard for this yet.

Do not add unnecessary complexity.


==================================================
TRACEABILITY
==================================================

The analysis must preserve:

requirement.id

as:

RequirementAnalysis.requirementId

The analysis must remain tied to the original requirement.

Do not create a new unrelated requirement identity.


==================================================
SECURITY
==================================================

Verify:

- API key remains server-side.
- No NEXT_PUBLIC_OPENROUTER_API_KEY.
- No key in source code.
- No key in Git.
- No key in UI.
- No key in API response.
- No key in logs.

Do not change .env.local handling from Phase 2 Step 1.


==================================================
TESTING
==================================================

Add or update tests where practical.

At minimum verify:

1. Valid requirement input.
2. Empty requirement rejected.
3. RequirementAnalysis response shape validated.
4. Invalid scores rejected.
5. Missing API key handled safely.
6. Provider error handled safely.

If an actual OpenRouter API key exists in .env.local, you may perform ONE controlled manual integration test.

Do not make repeated API calls.

Do not write the API key into any file.


==================================================
IMPORTANT — DO NOT OVERENGINEER
==================================================

Do NOT add:

- LangChain
- LangGraph
- Langflow
- n8n
- MCP
- RAG
- vector database
- Redis
- PostgreSQL
- Supabase
- authentication
- job queues
- background workers

We are implementing ONE agent.

Keep the architecture simple.


==================================================
VERIFICATION
==================================================

After implementation:

Run:

npm run lint

Run:

npm run build

If tests exist, run them.

Verify:

1. Application starts.
2. Requirement page loads.
3. Requirement can be submitted.
4. Server route works.
5. Requirement Agent calls OpenRouter.
6. DeepSeek V4 Flash returns structured analysis.
7. Analysis is validated.
8. Analysis appears in UI.
9. Requirement ID is preserved.
10. Loading state works.
11. Error state works.
12. API key remains server-side.
13. Existing navigation still works.
14. Other Phase 1 agents remain untouched.
15. No unrelated packages are installed.

If an actual API key is available, perform one real analysis using a simple login requirement and report the result structurally without exposing the API key.


==================================================
GIT
==================================================

Do NOT create a Git commit.

At the end provide:

1. Files created.
2. Files modified.
3. Requirement Agent architecture.
4. API route architecture.
5. Prompt design.
6. Validation approach.
7. Security verification.
8. Whether a real OpenRouter call was made.
9. Model used.
10. npm run lint result.
11. npm run build result.
12. Test results.
13. Any issues or design decisions.

STOP HERE.

Do NOT implement the Test Engine Agent.

Do NOT implement Test Data Agent.

Do NOT implement Automation Agent.

Do NOT implement Quality Agent.

Do NOT begin Phase 2 Step 3.