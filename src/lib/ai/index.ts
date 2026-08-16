// AI provider barrel — SERVER-ONLY.
//
// Importing this module from any client component will throw at build time.
// The Next.js server-only package is intentionally used to enforce the
// server/client boundary for the OpenRouter provider.

import "server-only";

export {
  OpenRouterError,
  generateStructuredResponse,
  getOpenRouterConfig,
  getResponseText,
  parseJsonResponse,
  type OpenRouterConfig,
  type OpenRouterErrorCode,
  type GenerateStructuredOptions,
} from "@/lib/ai/openrouter";

export type {
  OpenRouterChatMessage,
  OpenRouterChatResponse,
  OpenRouterRole,
  OpenRouterUsage,
} from "@/lib/ai/types";
