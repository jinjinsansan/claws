import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../env.js";

export function getClaude(env: Env): Anthropic {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

export interface LlmResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function chatCompletion(
  env: Env,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens = 1024
): Promise<LlmResponse> {
  const client = getClaude(env);
  const response = await client.messages.create({
    model: env.ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return {
    content: textBlock?.text ?? "",
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
