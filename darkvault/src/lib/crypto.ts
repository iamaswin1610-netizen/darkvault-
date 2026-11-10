// Real protection, not only visual:
// - the 6-digit code is stored only as a salted PBKDF2-SHA256 hash
// - files are encrypted with AES-256-GCM using a non-extractable device key
// - backups are encrypted with a key derived from the security code
import { kvGet, kvSet } from "./db";

export const PBKDF2_ITERATIONS = 310_000;
const enc = new TextEncoder();

export const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
};
export const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function pbkdf2Bits(code: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, [
    "deriveBits",
    "deriveKey",
  ]);
  return { base, salt, iterations };
}

export async function hashCode(code: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS) {
  const { base } = await pbkdf2Bits(code, salt, iterations);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    256,
  );
  return toB64(bits);
}

export async function verifyCode(
  code: string,
  saltB64: string,
  hashB64: string,
  iterations: number,
) {
  const h = await hashCode(code, fromB64(saltB64), iterations);
  // constant-time compare
  if (h.length !== hashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return diff === 0;
}

export async function deriveBackupKey(
  code: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
) {
  const { base } = await pbkdf2Bits(code, salt, iterations);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Device key: generated once, non-extractable, kept inside the browser's key storage. */
export async function getDeviceKey(): Promise<CryptoKey> {
  const existing = await kvGet<CryptoKey>("deviceKey");
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await kvSet("deviceKey", key);
  return key;
}

export async function encryptBytes(key: CryptoKey, data: ArrayBuffer) {
  const iv = randomBytes(12);
  const out = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data);
  return { iv, data: out };
}

export async function decryptBytes(key: CryptoKey, iv: Uint8Array, data: ArrayBuffer) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data);
}
