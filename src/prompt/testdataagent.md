We are continuing development of QAGuard AI.

CURRENT STATUS

QAGuard AI is a Next.js 16.3.1 + TypeScript application.

Completed and verified:

- Phase 1: Full governed QA pipeline with deterministic mocks
- GitHub repository published
- Vercel production deployment working
- Separate OpenRouter API keys for local and Vercel
- OpenRouter provider implemented server-side
- DeepSeek V4 Flash configured
- Requirement Agent — REAL LLM
- Test Engine Agent — REAL LLM
- Requirement Agent real API verification passed
- Test Engine Agent real API verification passed
- Human Review workflow already exists
- Test Data Agent is currently deterministic/mock
- Quality Agent is currently deterministic/mock
- Automation Agent is currently deterministic/mock

Existing verification:

- npm run lint passes
- npm run build passes
- verify:agent passes
- verify:engine passes
- Real OpenRouter calls confirmed
- DeepSeek V4 Flash confirmed
- Production Vercel deployment confirmed

Now implement:

==================================================
PHASE 2 — STEP 4
REAL TEST DATA AGENT
==================================================

GOAL

Replace the deterministic Test Data Agent with a real LLM-powered Test Data Agent using the existing OpenRouter provider.

The Test Data Agent must generate structured, useful, safe, traceable test data based on:

1. Requirement
2. RequirementAnalysis
3. Generated Test Cases

The Test Data Agent must NOT independently invent business rules.

The generated test data must be traceable to the test cases it supports.

IMPORTANT:

Do not redesign the application.

Do not introduce:

- Langflow
- n8n
- LangChain
- AI SDK
- database
- authentication
- additional infrastructure
- unnecessary npm packages

Reuse the existing:

- OpenRouter provider
- AI types
- QA types
- workflow state
- validation architecture
- error-handling architecture
- UI components
- Test Case contracts
- existing Test Data page

Do not implement Automation Agent or Quality Agent in this step.

==================================================
1. INSPECT EXISTING CONTRACTS FIRST
==================================================

Before modifying anything, inspect:

src/types/qa.ts

src/agents/test-data-agent.ts

src/lib/validation/

src/lib/state/workflow-provider.tsx

app/test-data/page.tsx

app/requirements/page.tsx

app/api/

Understand the existing TestData and TestDataField contracts.

Do NOT create duplicate TestData types.

Do NOT unnecessarily change existing public contracts.

If the existing contract is sufficient, preserve it.

==================================================
2. REAL TEST DATA AGENT
==================================================

Modify:

src/agents/test-data-agent.ts

Replace the deterministic implementation with a real async LLM implementation.

Expected behavior:

generateTestData(
  requirement,
  analysis,
  testCases
)

→ Promise<TestData[]>

Use:

src/lib/ai/openrouter.ts

Use the existing:

generateStructuredResponse()

Do NOT create another OpenRouter client.

The production implementation must use the real LLM.

==================================================
3. PROMPT DESIGN
==================================================

Create a versioned prompt:

TEST_DATA_PROMPT_VERSION = "1.0"

Keep prompt construction separate from the main agent logic where practical.

The system prompt must enforce the following.

GROUNDING

The model may only use information from:

- Requirement
- RequirementAnalysis
- Test Cases

Do not invent:

- business rules
- users
- permissions
- API endpoints
- database records
- validation rules
- integrations
- application behavior

If required information is missing, do not fabricate realistic-looking business data and present it as a requirement-derived fact.

Clearly distinguish:

- requirement-derived data
- generated synthetic data
- placeholder data

==================================================
4. TEST DATA QUALITY
==================================================

Generate useful test data for the generated test cases.

The agent should identify applicable data fields such as:

- username
- email
- password
- URL
- phone number
- date
- amount
- identifier
- search value
- invalid value
- boundary value
- required/empty value

But only when relevant to the test case.

Do NOT blindly create all field types for every test.

Each data item should have a clear purpose.

Example:

Test Case:
Invalid Login Password

Test Data:

username:
test.user@example.com

password:
WrongPassword123

Purpose:
Verify login failure when password is invalid.

==================================================
5. POSITIVE / NEGATIVE / BOUNDARY DATA
==================================================

Where supported by the requirement/test case, generate:

- valid data
- invalid data
- boundary data
- empty/null data
- special-character data
- duplicate data

Only generate these categories when they are relevant.

Do not generate arbitrary edge cases simply to increase the number of records.

==================================================
6. SECURITY / PRIVACY
==================================================

This is extremely important.

The Test Data Agent must NEVER generate or expose real secrets.

Never generate:

- real API keys
- real passwords
- real authentication tokens
- real access tokens
- real credit card numbers
- real production credentials
- real personal information
- real customer data

Use synthetic placeholders.

For example:

username:
qa.user@example.com

password:
<VALID_PASSWORD>

API token:
<TOKEN>

Do NOT put fake-looking secrets in a way that could be mistaken for real credentials.

The generated data should clearly be synthetic.

If sensitive data is required for a test case, represent it using placeholders such as:

<VALID_PASSWORD>
<AUTH_TOKEN>
<USER_EMAIL>

The existing UI should continue masking sensitive fields where applicable.

==================================================
7. TRACEABILITY
==================================================

Every generated test-data item must be traceable to the test case(s) it supports.

Use the existing traceability fields from:

src/types/qa.ts

Do NOT invent a new traceability architecture.

For example:

testCaseId:
TC-001

source:
test-case

This allows the eventual traceability dashboard to answer:

"Why was this test data generated?"

and:

"Which test case uses this data?"

If the existing contract uses different field names, follow the existing contract.

==================================================
8. TEST DATA STRUCTURE
==================================================

Respect the existing TestData and TestDataField types.

Inspect the exact structure before implementing.

The LLM must return strict structured JSON.

Do not accept arbitrary prose.

Do not parse markdown tables.

Do not parse free-form text.

The provider should be called using:

generateStructuredResponse({
  ...
  json: true
})

==================================================
9. VALIDATION
==================================================

Create:

src/lib/validation/test-data.ts

Implement a hand-written validator following the existing validation architecture.

Follow the same philosophy as:

src/lib/validation/requirement.ts

src/lib/validation/analysis.ts

src/lib/validation/test-cases.ts

Validate at minimum:

- response is an object
- testData is an array
- each data item has required fields
- IDs are valid
- field names are valid
- values are valid strings/appropriate types according to existing contract
- purpose/description is present where required
- testCaseId is valid when required
- traceability is valid
- source references are valid
- no malformed nested objects
- no unexpected enum values
- no fabricated test-case IDs
- no missing required fields

Do NOT silently repair malformed LLM output.

Reject invalid output.

Do NOT clamp or silently transform values.

==================================================
10. SECURITY VALIDATION
==================================================

Add validation against obvious credential leakage.

The validator should reject values that appear to contain:

- OpenRouter API keys
- bearer tokens
- JWT-like tokens
- obvious secret keys
- private keys
- other clearly credential-like content

Do not attempt to build a perfect secret scanner.

The objective is a reasonable safety guard for generated test data.

Never log sensitive generated values unnecessarily.

==================================================
11. AGENT ERROR HANDLING
==================================================

Create/use:

TestDataAgentError

Follow the same pattern as:

RequirementAgentError

TestEngineAgentError

Use controlled error codes such as:

- missing_api_key
- provider_error
- invalid_response
- empty_response

Do not expose:

- API key
- raw OpenRouter response
- stack traces
- internal implementation details

to the browser.

==================================================
12. MOCK PRESERVATION
==================================================

Preserve the Phase 1 deterministic Test Data Agent.

If necessary create:

src/agents/test-data-agent.mock.ts

with:

generateTestDataMock()

The mock must remain available for deterministic tests/fallback scenarios.

IMPORTANT:

The normal production API path must NOT call the mock.

The production path must call the real Test Data Agent.

==================================================
13. API ROUTE
==================================================

Create:

app/api/test-data/generate/route.ts

Expected flow:

POST
  ↓
Validate request
  ↓
Requirement
  ↓
RequirementAnalysis
  ↓
TestCases
  ↓
Real Test Data Agent
  ↓
Validate LLM output
  ↓
Return TestData[]
  ↓
Safe error mapping

Use the same server-side architecture as:

app/api/requirements/analyze/route.ts

app/api/test-cases/generate/route.ts

Do NOT call OpenRouter from the browser.

==================================================
14. API INPUT VALIDATION
==================================================

Validate:

Requirement exists and is structurally valid.

RequirementAnalysis exists and is structurally valid.

TestCases exists and is a non-empty valid array when required.

Each test case must be structurally valid.

Test data generation must not proceed with malformed upstream state.

Return HTTP 400 for invalid client input.

Return appropriate safe server/provider errors for downstream failures.

==================================================
15. REQUIREMENT WORKFLOW
==================================================

Update the existing workflow.

Current workflow:

Requirement
 ↓
Requirement Agent
 ↓
Test Engine
 ↓
mock Test Data
 ↓
mock Quality

Change to:

Requirement
 ↓
Requirement Agent — REAL
 ↓
Test Engine — REAL
 ↓
Test Data Agent — REAL
 ↓
existing workflow state
 ↓
Human Review

Do NOT change the Human Review architecture.

Do NOT implement Quality Agent in this step.

Do NOT implement Automation Agent in this step.

==================================================
16. UI
==================================================

Inspect:

app/test-data/page.tsx

and the existing workflow UI.

Update it so the real Test Data Agent is represented correctly.

Show an appropriate loading state, for example:

"Generating test data..."

Do not expose:

- OpenRouter
- DeepSeek
- API keys
- provider errors
- internal agent errors

to normal users.

If generation fails, show a safe user-facing message.

Keep the existing QAGuard UI design.

Do not redesign unrelated pages.

==================================================
17. TEST DATA EDITING
==================================================

Preserve the existing user experience that allows generated test data to be reviewed/edited where already supported.

The goal is:

AI generates
    ↓
Human reviews
    ↓
Human edits if required
    ↓
Data is used by downstream workflow

Do not make AI-generated test data immutable.

Do not automatically treat AI-generated values as approved truth.

==================================================
18. HUMAN-IN-THE-LOOP PRINCIPLE
==================================================

QAGuard AI is a governance-focused product.

The Test Data Agent must be treated as an AI assistant.

Generated data is:

AI-generated
NOT automatically approved.

Preserve the existing review workflow and status fields.

Do not introduce automatic approval.

==================================================
19. VERIFICATION SCRIPT
==================================================

Create or update a verification script following the existing:

scripts/verify-engine.mts

pattern.

Create:

scripts/verify-test-data.mts

and npm script:

verify:test-data

The verification must NOT require a real API key.

Test at least:

1. valid TestData response
2. missing testData
3. empty testData when invalid
4. malformed TestData object
5. malformed TestDataField
6. missing required field
7. invalid testCaseId
8. invalid traceability
9. malformed source
10. invalid enum
11. credential-like value rejection
12. malformed upstream test case
13. missing API key error mapping
14. provider error mapping
15. mock implementation shape

Also run:

npm run verify:agent

npm run verify:engine

==================================================
20. REAL OPENROUTER TEST
==================================================

After implementation, perform ONE real local end-to-end test.

Use the existing .env.local.

DO NOT print the API key.

Use the HR Innova login requirement already used in previous tests:

"As a registered HR Innova user, I want to log in using my valid username and password so that I can securely access the dashboard."

The expected real pipeline is:

Requirement Agent
 ↓
DeepSeek V4 Flash
 ↓
Requirement Analysis
 ↓
Test Engine Agent
 ↓
DeepSeek V4 Flash
 ↓
Test Cases
 ↓
Test Data Agent
 ↓
DeepSeek V4 Flash
 ↓
Test Data

Verify:

- real Requirement Agent used
- real Test Engine Agent used
- real Test Data Agent used
- no Test Data mock used
- generated data is traceable to test cases
- generated data is synthetic
- no real secrets are generated
- OpenRouter usage confirms the requests
- DeepSeek V4 Flash is confirmed

==================================================
21. REGRESSION TESTING
==================================================

Run:

npm run lint

npm run build

Also verify:

- dashboard works
- requirements page works
- test cases page works
- test data page works
- review page works
- quality page works
- automation page works
- Requirement Agent still works
- Test Engine Agent still works
- existing workflow state is preserved

Do not make unrelated changes.

==================================================
22. PERFORMANCE
==================================================

Do not optimize model latency in this step.

The previous real Requirement + Test Engine requests may take significant time.

Prioritize:

correctness
grounding
validation
traceability
security

Performance optimization can be handled later after the complete pipeline works.

==================================================
23. SECURITY CHECKS
==================================================

Before reporting completion verify:

- .env.local is gitignored
- no NEXT_PUBLIC_OPENROUTER_API_KEY
- no API key in source
- no API key in .env.local.example
- no credential values in test fixtures
- no credentials printed in logs
- no OpenRouter calls from client components
- provider remains server-only
- API errors are sanitized

==================================================
24. GIT / DEPLOYMENT
==================================================

Do NOT:

- git commit
- git push
- deploy to Vercel

I will review the implementation first.

==================================================
25. FINAL REPORT
==================================================

When complete, report:

1. files created
2. files modified
3. existing TestData contract used
4. Test Data Agent architecture
5. prompt design
6. grounding rules
7. security rules
8. validation rules
9. API route behavior
10. mock preservation
11. Human Review compatibility
12. verification results
13. npm run lint result
14. npm run build result
15. Requirement Agent regression result
16. Test Engine regression result
17. whether a real OpenRouter call was made
18. whether DeepSeek V4 Flash was confirmed
19. whether the real Test Data Agent was used instead of the mock
20. number of generated test-data records
21. traceability verification
22. any issues or deviations

Do not proceed to Quality Agent or Automation Agent.

This task is ONLY:

PHASE 2 — STEP 4 — REAL TEST DATA AGENT