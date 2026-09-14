// src/utils/aiClient.ts

import { getActiveConfig, MissingApiKeyError } from "./aiKey";

export { MissingApiKeyError };

export class AIRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AIRequestError";
    this.status = status;
  }
}

export interface CallAIOptions {
  prompt: string;
  json?: boolean;
  temperature?: number;
  signal?: AbortSignal;
  maxTokens?: number;
}

export async function callAI({
  prompt,
  json = false,
  temperature = 0.3,
  signal,
  maxTokens,
}: CallAIOptions): Promise<string> {
  const config = await getActiveConfig();
  if (!config) throw new MissingApiKeyError();
  if (config.provider.requiresKey && !config.key)
    throw new MissingApiKeyError();

  const url = `${config.baseUrl.replace(/\/$/, "")}/chat/completions`;

  const body: Record<string, unknown> = {
    model: config.model,
    messages: [{ role: "user", content: prompt }],
    temperature,
  };
  if (json) body.response_format = { type: "json_object" };
  if (maxTokens) body.max_tokens = maxTokens;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.key) headers.Authorization = `Bearer ${config.key}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    throw new AIRequestError(
      config.provider.id === "ollama"
        ? "Could not reach Ollama. Make sure it is running on your machine."
        : "Could not reach the AI provider. Check your connection.",
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `AI request failed (${res.status})`;
    try {
      const parsed = JSON.parse(text);
      const detail =
        parsed?.error?.message || parsed?.error || parsed?.message || "";
      if (detail) message += `: ${String(detail).slice(0, 200)}`;
    } catch {
      if (text) message += `: ${text.slice(0, 200)}`;
    }
    throw new AIRequestError(message, res.status);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new AIRequestError("AI returned an empty response.");
  }
  return content;
}

export async function callAIJSON<T>(
  prompt: string,
  signal?: AbortSignal,
): Promise<T> {
  const text = await callAI({ prompt, json: true, temperature: 0.2, signal });
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
