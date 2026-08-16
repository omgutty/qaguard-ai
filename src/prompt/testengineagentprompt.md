We are continuing development of QAGuard AI.

Current status:

- Next.js 16.3.1 + TypeScript application
- GitHub repository is published
- Vercel production deployment is working
- Local OpenRouter integration is working
- Vercel uses a separate OpenRouter API key
- DeepSeek V4 Flash is the configured model
- Requirement Agent is already using the real OpenRouter/DeepSeek API
- Phase 1 deterministic mock pipeline is preserved where appropriate
- Phase 2 Step 2 Requirement Agent is complete and verified
- npm run lint passes
- npm run build passes
- Production requirement analysis test passes

Now implement:

PHASE 2 — STEP 3
REAL TEST ENGINE AGENT

Goal:

Replace the deterministic mock Test Engine Agent with a real LLM-powered Test Engine Agent using the existing OpenRouter provider.

IMPORTANT:
Do not redesign the application.
Do not introduce Langflow, n8n, LangChain, an AI SDK, database, authentication, or additional infrastructure.
Reuse the existing OpenRouter provider, validation patterns, types, workflow state, and UI architecture.

The Test Engine must generate test cases from:

1. The original Requirement
2. The already-generated RequirementAnalysis

Do NOT ask the LLM to independently reinterpret the requirement when RequirementAnalysis is available.

==================================================
1. TEST ENGINE AGENT
==================================================

Modify:

src/agents/test-engine-agent.ts

Replace the deterministic mock implementation with a real async implementation.

Expected signature should remain compatible with the existing Phase 1 architecture, but adapt it to async if required.

The agent should receive:

- Requirement
- RequirementAnalysis

and return:

- TestCase[]

Use the existing:

src/lib/ai/openrouter.ts

and its structured JSON response functionality.

Do not create another OpenRouter client.

==================================================
2. PROMPT DESIGN
==================================================

Create a versioned prompt constant, for example:

TEST_ENGINE_PROMPT_VERSION = "1.0"

Keep the system prompt separate from the agent implementation where practical.

The system prompt must enforce:

GROUNDING:

- Use only information contained in the supplied Requirement and RequirementAnalysis.
- Do not invent business rules.
- Do not invent UI elements.
- Do not invent API endpoints.
- Do not invent database behavior.
- Do not invent validation rules that are not supported by the requirement or analysis.
- Do not invent integrations.
- If information is missing, create an appropriate coverage/gap test only when justified by the RequirementAnalysis.
- Do not fabricate expected results.

TEST COVERAGE:

Generate meaningful QA test cases covering applicable categories such as:

- positive / happy path
- negative scenarios
- boundary conditions
- validation
- authorization/security when supported by the requirement
- error handling
- relevant edge cases
- regression coverage where justified

Do not blindly generate every category if it is not applicable.

QUALITY:

- Avoid duplicate test cases.
- Avoid trivial variations.
- Each test case must have a clear objective.
- Preconditions must be explicit where required.
- Test steps must be executable and unambiguous.
- Expected results must be observable and testable.

TRACEABILITY:

Every test case must identify what requirement or analysis item caused it to be generated.

Use the existing traceability/data-contract fields in src/types/qa.ts.

Do not invent a new traceability architecture.

==================================================
3. STRUCTURED OUTPUT
==================================================

The LLM must return strict JSON.

Use the existing generateStructuredResponse() functionality.

Do not parse arbitrary prose.

The output should contain the fields required by the existing TestCase type.

Preserve compatibility with:

src/types/qa.ts

Before changing the TestCase type, inspect the existing type carefully.

Do not change existing public contracts unless genuinely required.

==================================================
4. VALIDATION
==================================================

Create:

src/lib/validation/test-cases.ts

Implement a hand-written validator, following the same philosophy as:

src/lib/validation/requirement.ts
src/lib/validation/analysis.ts

Validate at minimum:

- response is an object
- testCases is an array
- each test case has a valid id
- title is a non-empty string
- description/objective is valid
- test type is one of the existing TestCaseType values
- priority is one of the existing TestPriority values
- steps are a valid non-empty array
- each step has valid required fields
- expected result is present
- requirement/analysis traceability fields are valid
- no malformed objects
- no unexpected fabricated identifiers where the existing contract requires source IDs

Do NOT silently repair invalid LLM output.

Reject invalid output with a controlled error.

Follow the same error-handling pattern already used by RequirementAgentError.

==================================================
5. AGENT ERROR HANDLING
==================================================

Create/use a controlled TestEngineAgentError.

Possible categories can include:

- missing_api_key
- provider_error
- invalid_response
- empty_response

Follow the existing Requirement Agent pattern.

Never expose:

- API keys
- raw provider errors
- internal stack traces
- internal implementation details

to the browser.

==================================================
6. API ROUTE
==================================================

Create:

app/api/test-cases/generate/route.ts

Expected flow:

POST request
    ↓
validate request
    ↓
receive Requirement
    ↓
receive RequirementAnalysis
    ↓
call Test Engine Agent
    ↓
validate LLM response
    ↓
return TestCase[]
    ↓
safe error mapping

Do not call the LLM directly from a client component.

The OpenRouter call must remain server-side.

Use the same architecture as:

app/api/requirements/analyze/route.ts

==================================================
7. REQUIREMENT PAGE / TEST CASE UI
==================================================

Inspect the current workflow carefully.

The existing Requirement page currently runs the requirement analysis and downstream mock pipeline.

Modify the workflow so that Test Engine generation uses the real API route.

Do not break the existing requirement analysis.

The intended flow should become:

Requirement submission
    ↓
Requirement Analysis API
    ↓
Requirement Analysis
    ↓
Test Case Generation API
    ↓
Real Test Engine Agent
    ↓
Test Cases
    ↓
Existing workflow state
    ↓
Test Cases page

The UI should show an appropriate loading state such as:

"Generating test cases..."

Do not expose implementation details such as "OpenRouter" or "DeepSeek" as an error message.

==================================================
8. HUMAN REVIEW COMPATIBILITY
==================================================

Do not remove or redesign the existing Human Review workflow.

Generated test cases must remain compatible with:

/review

The reviewer must still be able to:

- approve
- reject
- edit

test cases using the existing Phase 1 implementation.

Only approved test cases should later proceed to automation.

Do not implement the Automation Agent in this step.

==================================================
9. MOCK PRESERVATION
==================================================

Preserve the Phase 1 deterministic Test Engine mock.

Rename it if necessary, for example:

src/agents/test-engine-agent.mock.ts

with:

generateTestCasesMock()

This is for fallback/testing purposes only.

The normal production pipeline must use the real LLM Test Engine Agent.

Do not accidentally call the mock from the production API route.

==================================================
10. SECURITY
==================================================

Verify:

- OPENROUTER_API_KEY is never referenced in client code
- no NEXT_PUBLIC_OPENROUTER_API_KEY
- no API key hardcoded in source
- .env.local remains gitignored
- .env.local.example contains no real key
- API errors are sanitized
- browser only communicates with our Next.js API routes

==================================================
11. TESTING
==================================================

Create or update a verification script following the existing:

scripts/verify-agent.mts

pattern.

The verification must test at least:

1. valid TestCase response
2. missing testCases
3. empty testCases if invalid according to the contract
4. malformed test case
5. invalid test type
6. invalid priority
7. malformed steps
8. missing expected result
9. invalid traceability
10. requirement/analysis mismatch
11. missing API key error mapping
12. provider error mapping
13. mock implementation shape

Do NOT make the verification script depend on a real API key.

Also run:

npm run lint

npm run build

and all relevant verification scripts.

==================================================
12. REAL API TEST
==================================================

After implementation is complete:

Do one real local test using the existing .env.local.

Do NOT print the API key.

Use a realistic requirement such as:

"As a registered HR Innova user, I want to log in using my valid username and password so that I can securely access the dashboard."

Verify that:

- Requirement Agent runs
- Test Engine Agent runs
- OpenRouter usage shows the real request
- DeepSeek V4 Flash is used
- test cases are returned
- test cases are traceable to the requirement/analysis
- no mock Test Engine is being used

Do not test the Automation Agent yet.

==================================================
13. REGRESSION CHECKS
==================================================

After implementation:

- npm run lint must pass
- npm run build must pass
- existing Requirement Agent must continue working
- existing dashboard must work
- existing Human Review page must work
- existing Test Cases page must work
- existing Test Data behavior must not be unnecessarily changed
- existing Quality page must not be broken

Do not change unrelated UI.

==================================================
14. GIT
==================================================

Do NOT create a Git commit.

Do NOT push to GitHub.

Do NOT deploy to Vercel.

I will handle the Git checkpoint after I review your implementation.

==================================================
15. FINAL REPORT
==================================================

When finished, report:

1. files created
2. files modified
3. Test Engine Agent architecture
4. prompt design
5. validation rules
6. API route behavior
7. mock preservation
8. security checks
9. verification test results
10. npm run lint result
11. npm run build result
12. whether a real OpenRouter request was successfully made
13. whether DeepSeek V4 Flash was confirmed
14. whether Test Engine used the real LLM instead of the mock
15. any issues or deviations

Do not proceed to Test Data Agent or Automation Agent.
This task is ONLY Phase 2 Step 3 — Real Test Engine Agent.