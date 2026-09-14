// src/utils/aiKey.ts

import { PROVIDERS, getProvider } from "./aiProviders";
import type { ProviderId, ProviderPreset } from "./aiProviders";
import { encryptString, decryptString } from "./secureStorage";

// ============================================================
// Storage layout
// ============================================================
// sessionStorage  → rb-ai-config-v2  (encrypted key + provider + model + baseUrl)
// localStorage    → rb-device-secret-v1  (device-scoped encryption secret)
// ============================================================

const SESSION_KEY = "rb-ai-config-v2";
const INACTIVITY_KEY = "rb-ai-inactivity-minutes-v1";
const DEFAULT_INACTIVITY = 60; // minutes

export const AI_KEY_EVENT = "rb-ai-key-change";
export const OPEN_SETTINGS_EVENT = "rb-open-ai-settings";

export interface ActiveConfig {
  provider: ProviderPreset;
  model: string;
  baseUrl: string;
  key: string | null;
  verifiedAt: number;
}

interface RawStored {
  providerId: ProviderId;
  model: string;
  baseUrl: string;
  encryptedKey: string | null;
  verifiedAt: number;
}

// ============================================================
// In-memory cache (plaintext key held only for this session)
// ============================================================
let memoryCache: RawStored | null = null;
let memoryKey: string | null = null;
let memoryLoaded = false;
let inactivityTimer: number | null = null;

// ============================================================
// Low-level read/write
// ============================================================
function readRaw(): RawStored | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RawStored;
  } catch {
    return null;
  }
}

function writeRaw(cfg: RawStored | null): void {
  try {
    if (cfg) sessionStorage.setItem(SESSION_KEY, JSON.stringify(cfg));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ============================================================
// Inactivity timer
// ============================================================
export function getInactivityMinutes(): number {
  try {
    const raw = localStorage.getItem(INACTIVITY_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    if (!isNaN(n) && n > 0) return n;
  } catch {
    // ignore
  }
  return DEFAULT_INACTIVITY;
}

export function setInactivityMinutes(minutes: number): void {
  try {
    localStorage.setItem(INACTIVITY_KEY, String(Math.max(1, minutes)));
    resetActivityTimer();
  } catch {
    // ignore
  }
}

function lockNowInternal(reason: "manual" | "inactivity" | "tab-close"): void {
  memoryCache = null;
  memoryKey = null;
  writeRaw(null);
  try {
    window.dispatchEvent(new CustomEvent(AI_KEY_EVENT, { detail: { reason } }));
  } catch {
    // ignore
  }
}

export function lockNow(): void {
  lockNowInternal("manual");
}

function resetActivityTimer(): void {
  if (inactivityTimer) window.clearTimeout(inactivityTimer);
  const mins = getInactivityMinutes();
  inactivityTimer = window.setTimeout(
    () => {
      if (memoryCache || memoryKey) lockNowInternal("inactivity");
    },
    mins * 60 * 1000,
  );
}

function noteActivity(): void {
  resetActivityTimer();
}

if (typeof window !== "undefined") {
  ["mousedown", "keydown", "touchstart", "click"].forEach((evt) => {
    window.addEventListener(evt, noteActivity, { passive: true });
  });
  resetActivityTimer();
}

// ============================================================
// Load / save
// ============================================================
async function ensureLoaded(): Promise<void> {
  if (memoryLoaded) return;
  memoryLoaded = true;

  const raw = readRaw();
  if (!raw) return;

  memoryCache = raw;
  if (raw.encryptedKey) {
    memoryKey = await decryptString(raw.encryptedKey);
  }
}

export async function getActiveConfig(): Promise<ActiveConfig | null> {
  await ensureLoaded();
  if (!memoryCache) {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim()) {
      return {
        provider: getProvider("gemini"),
        model: "gemini-3.6-flash",
        baseUrl: getProvider("gemini").baseUrl,
        key: envKey,
        verifiedAt: 0,
      };
    }
    return null;
  }

  return {
    provider: getProvider(memoryCache.providerId),
    model: memoryCache.model,
    baseUrl: memoryCache.baseUrl,
    key: memoryKey,
    verifiedAt: memoryCache.verifiedAt,
  };
}

export async function saveConfig(opts: {
  providerId: ProviderId;
  model: string;
  baseUrl: string;
  key: string | null;
}): Promise<void> {
  const encryptedKey = opts.key ? await encryptString(opts.key) : null;
  const raw: RawStored = {
    providerId: opts.providerId,
    model: opts.model,
    baseUrl: opts.baseUrl,
    encryptedKey,
    verifiedAt: Date.now(),
  };
  memoryCache = raw;
  memoryKey = opts.key;
  memoryLoaded = true;
  writeRaw(raw);
  resetActivityTimer();
  window.dispatchEvent(new CustomEvent(AI_KEY_EVENT));
}

export async function clearConfig(): Promise<void> {
  lockNowInternal("manual");
}

// ============================================================
// Helpers used by the UI
// ============================================================
export async function hasApiKey(): Promise<boolean> {
  await ensureLoaded();
  if (memoryCache) {
    const p = getProvider(memoryCache.providerId);
    if (!p.requiresKey) return true;
    return !!memoryKey;
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  return !!envKey && envKey.trim().length > 0;
}

export async function getStoredMeta(): Promise<{
  providerId: ProviderId;
  model: string;
  maskedKey: string | null;
  verifiedAt: number;
  isEnvFallback: boolean;
} | null> {
  await ensureLoaded();
  if (memoryCache) {
    return {
      providerId: memoryCache.providerId,
      model: memoryCache.model,
      maskedKey: memoryKey ? maskKey(memoryKey) : null,
      verifiedAt: memoryCache.verifiedAt,
      isEnvFallback: false,
    };
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim()) {
    return {
      providerId: "gemini",
      model: "gemini-3.6-flash",
      maskedKey: maskKey(envKey),
      verifiedAt: 0,
      isEnvFallback: true,
    };
  }
  return null;
}

export function maskKey(key: string): string {
  if (!key || key.length < 12) return "••••••••";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

// ============================================================
// Error + event helpers
// ============================================================
export class MissingApiKeyError extends Error {
  code = "NO_API_KEY" as const;
  constructor() {
    super("No AI provider configured. Add one in AI Settings.");
    this.name = "MissingApiKeyError";
  }
}

export function isMissingKeyError(err: any): boolean {
  return err?.name === "MissingApiKeyError" || err?.code === "NO_API_KEY";
}

export function openAISettings(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

// ============================================================
// Verification against the provider — the ONLY source of truth
// ============================================================
export async function verifyConfig(opts: {
  providerId: ProviderId;
  model: string;
  baseUrl: string;
  key: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const provider = getProvider(opts.providerId);

  // ---- Structural checks only (no format assumptions) ----
  if (provider.requiresKey) {
    const trimmed = (opts.key || "").trim();
    if (!trimmed) {
      return { ok: false, error: "Please enter an API key." };
    }
    if (trimmed.length < 15) {
      return {
        ok: false,
        error: "That key looks too short — check you pasted the whole thing.",
      };
    }
  }

  if (!opts.baseUrl.trim()) {
    return { ok: false, error: "Base URL is required." };
  }
  if (!opts.model.trim()) {
    return { ok: false, error: "Model name is required." };
  }

  // ---- Ask the provider ----
  const url = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.key) headers.Authorization = `Bearer ${opts.key}`;

  const body = JSON.stringify({
    model: opts.model,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
    max_tokens: 10,
    temperature: 0,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) return { ok: true };

    // Extract the provider's error message if any
    const text = await res.text().catch(() => "");
    let detail = "";
    try {
      const parsed = JSON.parse(text);
      detail = parsed?.error?.message || parsed?.error || parsed?.message || "";
    } catch {
      detail = text;
    }
    const shortDetail = String(detail).slice(0, 200);

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          "Could not validate — the provider rejected this key. Check it was copied fully and is active." +
          (shortDetail ? ` (${shortDetail})` : ""),
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        error:
          `Could not find the model "${opts.model}" at this provider. ` +
          "Check the model name or try the default one.",
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        error:
          "The key works but is rate-limited or out of free quota for today. Try again later or use a different key.",
      };
    }
    if (res.status >= 500) {
      return {
        ok: false,
        error:
          "The provider is having server issues right now. Try again in a minute.",
      };
    }
    return {
      ok: false,
      error:
        `Could not validate (HTTP ${res.status}).` +
        (shortDetail ? ` ${shortDetail}` : ""),
    };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return {
        ok: false,
        error:
          "Timed out trying to reach the provider. Check your internet connection.",
      };
    }
    if (opts.providerId === "ollama") {
      return {
        ok: false,
        error:
          "Couldn't reach Ollama. Make sure it's running and CORS is enabled (OLLAMA_ORIGINS=*).",
      };
    }
    return {
      ok: false,
      error:
        "Couldn't reach the provider. Check your internet connection and that the base URL is correct.",
    };
  }
}

export { PROVIDERS };
export type { ProviderId, ProviderPreset };
