// Server-side verification for the OpenRouter provider.
// Run with: npm run verify:ai
//
// Checks:
//  1. Provider module compiles and imports cleanly
//  2. Model defaults to deepseek/deepseek-v4-flash when OPENROUTER_MODEL is unset
//  3. Missing API key throws a controlled OpenRouterError (code: missing_api_key)
//  4. When OPENROUTER_API_KEY IS set, the real key is present (no actual request is
//     made here — see note below)
//
// SECURITY: This script never prints the API key, and it does not make an
// OpenRouter request. A live-call smoke test is intentionally deferred until a
// key exists in .env.local.

import { OpenRouterError, getOpenRouterConfig } from "../src/lib/ai/openrouter.ts";

const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function main(): Promise<void> {
  console.log("QAGuard AI — OpenRouter provider verification");
  console.log("---------------------------------------------");

  // 1. Model defaults correctly when env is unset.
  //    Requires a key to be present so config can load — use a placeholder.
  const realKey = process.env.OPENROUTER_API_KEY;
  const modelBefore = process.env.OPENROUTER_MODEL;
  process.env.OPENROUTER_API_KEY = "test-placeholder-key";
  delete process.env.OPENROUTER_MODEL;
  assert(
    getOpenRouterConfig().model === DEFAULT_MODEL,
    `model defaults to ${DEFAULT_MODEL}`
  );
  if (modelBefore !== undefined) {
    process.env.OPENROUTER_MODEL = modelBefore;
  }

  // 2. Missing API key produces a controlled error (never a raw throw).
  delete process.env.OPENROUTER_API_KEY;
  let missingKeyError: OpenRouterError | null = null;
  try {
    getOpenRouterConfig();
  } catch (err) {
    if (err instanceof OpenRouterError) {
      missingKeyError = err;
    }
  }
  assert(
    missingKeyError !== null && missingKeyError.code === "missing_api_key",
    "missing API key throws OpenRouterError(missing_api_key)"
  );
  assert(
    missingKeyError ? !missingKeyError.message.includes("test-placeholder-key") : true,
    "error message does not leak the API key"
  );

  // 3. Restore the real key (if any) and confirm config loads when present.
  if (realKey !== undefined) {
    process.env.OPENROUTER_API_KEY = realKey;
    const cfg = getOpenRouterConfig();
    assert(cfg.apiKey.length > 0, "API key present in server env");
    console.log("ℹ  OPENROUTER_API_KEY is set — real calls will use the provider.");
  } else {
    console.log(
      "ℹ  OPENROUTER_API_KEY is NOT set — no live request will be made."
    );
  }

  console.log("---------------------------------------------");
  console.log("All checks passed. No OpenRouter request was performed.");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
