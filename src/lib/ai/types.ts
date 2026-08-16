// Shared types for the OpenRouter provider. No client code may import these
// server-only modules — the provider boundary is enforced in src/lib/ai/index.ts.

export type OpenRouterRole = "system" | "user" | "assistant";

export interface OpenRouterChatMessage {
  role: OpenRouterRole;
  content: string;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: OpenRouterRole;
      content: string | Array<{ type: string; text?: string }>;
    };
    finish_reason: string;
  }>;
  usage?: OpenRouterUsage;
}
