// src/utils/secureStorage.ts

// AES-GCM encryption with a device-scoped secret.
// Not a security boundary on its own (an XSS could read the secret too),
// but it stops casual DevTools snooping and makes storage dumps unreadable.

const DEVICE_SECRET_KEY = "rb-device-secret-v1";
const APP_SALT = "resume-studio-byok-v1";
const ITERATIONS = 100_000;
const IV_BYTES = 12;

function getOrCreateDeviceSecret(): string {
  let secret = localStorage.getItem(DEVICE_SECRET_KEY);
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem(DEVICE_SECRET_KEY, secret);
  }
  return secret;
}

async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const secret = getOrCreateDeviceSecret();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(APP_SALT),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toB64(buf: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}

function fromB64(str: string): Uint8Array {
  const binary = atob(str);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function encryptString(plaintext: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  return `${toB64(iv)}.${toB64(new Uint8Array(ct))}`;
}

export async function decryptString(payload: string): Promise<string | null> {
  const parts = payload.split(".");
  if (parts.length !== 2) return null;
  try {
    const key = await deriveKey();
    const iv = fromB64(parts[0]);
    const ct = fromB64(parts[1]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
