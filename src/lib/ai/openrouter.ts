// OpenRouter provider — server-side only.
// This module MUST NOT be imported from client components, pages, or hooks.

import type { OpenRouterChatMessage, OpenRouterChatResponse } from "./types.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  /** OpenRouter supports providers preferences etc. via extra headers. */
  extraHeaders?: Record<string, string>;
}

/** Load configuration from server env. Throws a controlled error if the key is missing. */
export function getOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not set. Add it to your .env.local file.",
      "missing_api_key"
    );
  }
  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type OpenRouterErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "http_error"
  | "rate_limited"
  | "empty_response"
  | "invalid_json"
  | "network_error";

export class OpenRouterError extends Error {
  code: OpenRouterErrorCode;
  status?: number;
  constructor(message: string, code: OpenRouterErrorCode, status?: number) {
    super(message);
    this.name = "OpenRouterError";
    this.code = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

export interface GenerateStructuredOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** When true, we request JSON via the response_format field. */
  json?: boolean;
}

/**
 * Send a chat completion request to OpenRouter.
 * Server-side only. Never call from the browser.
 */
export async function generateStructuredResponse(
  messages: OpenRouterChatMessage[],
  options: GenerateStructuredOptions = {}
): Promise<OpenRouterChatResponse> {
  const { apiKey, model, extraHeaders } = getOpenRouterConfig();
  const effectiveModel = options.model ?? model;

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "QAGuard AI",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  } catch {
    throw new OpenRouterError(
      "Network error while contacting OpenRouter. Check server connectivity.",
      "network_error"
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new OpenRouterError(
        "OpenRouter rejected the API key. Check OPENROUTER_API_KEY.",
        "invalid_api_key",
        401
      );
    }
    if (response.status === 429) {
      throw new OpenRouterError(
        "OpenRouter rate limit exceeded. Retry later.",
        "rate_limited",
        429
      );
    }
    throw new OpenRouterError(
      `OpenRouter returned HTTP ${response.status}.`,
      "http_error",
      response.status
    );
  }

  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("choices" in data) ||
    !Array.isArray((data as { choices: unknown }).choices) ||
    (data as { choices: unknown[] }).choices.length === 0
  ) {
    throw new OpenRouterError(
      "OpenRouter returned an empty response.",
      "empty_response"
    );
  }

  return data as OpenRouterChatResponse;
}

// ---------------------------------------------------------------------------
// Typed JSON helpers
// ---------------------------------------------------------------------------

/** Extract the assistant message text from a response. */
export function getResponseText(response: OpenRouterChatResponse): string {
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new OpenRouterError(
      "OpenRouter returned a response with no content.",
      "empty_response"
    );
  }
  return typeof content === "string" ? content : JSON.stringify(content);
}

/** Safely parse assistant content as JSON. Throws a controlled error if invalid. */
export function parseJsonResponse<T>(response: OpenRouterChatResponse): T {
  const text = getResponseText(response);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new OpenRouterError(
      "OpenRouter returned invalid JSON. Retry or adjust the prompt.",
      "invalid_json"
    );
  }
}
