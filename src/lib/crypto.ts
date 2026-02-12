import { base64UrlToBytes, bytesToBase64Url } from "@/lib/base64url";

const ivLengthBytes = 12;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function exportKeyToBase64Url(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToBase64Url(new Uint8Array(raw));
}

export async function importKeyFromBase64Url(base64Key: string): Promise<CryptoKey> {
  const rawBytes = base64UrlToBytes(base64Key);
  const raw = new ArrayBuffer(rawBytes.byteLength);
  new Uint8Array(raw).set(rawBytes);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptBytes(plain: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(ivLengthBytes));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    toArrayBuffer(plain)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return combined;
}

export async function decryptBytes(combined: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> {
  if (combined.byteLength < ivLengthBytes + 1) {
    throw new Error("Invalid encrypted payload.");
  }

  const iv = combined.slice(0, ivLengthBytes);
  const encrypted = combined.slice(ivLengthBytes);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, toArrayBuffer(encrypted));
}
