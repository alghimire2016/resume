// src/utils/aiProviders.ts

export type ProviderId =
  | "gemini"
  | "grok"
  | "openrouter"
  | "deepseek"
  | "openai"
  | "ollama"
  | "custom";

export interface ProviderPreset {
  id: ProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  keyPlaceholder: string;
  requiresKey: boolean;
  signupUrl?: string;
}

export const PROVIDERS: ProviderPreset[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.6-flash",
    models: [
      "gemini-3.6-flash",
      "gemini-3.6-pro",
      "gemini-3.5-flash",
      "gemini-3.5-pro",
    ],
    keyPlaceholder: "Paste your key (AIza... or AQ.AB...)",
    requiresKey: true,
    signupUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "grok",
    label: "Grok (xAI)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4-fast",
    models: ["grok-4-fast", "grok-4", "grok-3"],
    keyPlaceholder: "Paste your xAI key",
    requiresKey: true,
    signupUrl: "https://x.ai/api",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    models: [
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "deepseek/deepseek-chat",
      "google/gemini-2.0-flash-exp:free",
    ],
    keyPlaceholder: "Paste your OpenRouter key",
    requiresKey: true,
    signupUrl: "https://openrouter.ai/keys",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyPlaceholder: "Paste your DeepSeek key",
    requiresKey: true,
    signupUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "ollama",
    label: "Ollama (local, no key)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.3",
    models: ["llama3.3", "qwen2.5:14b", "mistral", "phi4"],
    keyPlaceholder: "(not required)",
    requiresKey: false,
  },
  {
    id: "custom",
    label: "Custom OpenAI-compatible URL",
    baseUrl: "",
    defaultModel: "",
    models: [],
    keyPlaceholder: "Paste your key",
    requiresKey: true,
  },
];

export function getProvider(id: ProviderId): ProviderPreset {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
}
