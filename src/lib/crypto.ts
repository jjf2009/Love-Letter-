import { base64UrlToBytes, bytesToBase64Url } from '@/lib/base64url';

const IV_LENGTH_BYTES = 12;

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available in this environment');
  }
  return globalThis.crypto;
}

export async function generateAesGcmKey(): Promise<CryptoKey> {
  return getCrypto().subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function exportKeyToBase64Url(key: CryptoKey): Promise<string> {
  const raw = await getCrypto().subtle.exportKey('raw', key);
  return bytesToBase64Url(new Uint8Array(raw));
}

export async function importKeyFromBase64Url(keyBase64Url: string): Promise<CryptoKey> {
  const raw = base64UrlToBytes(keyBase64Url);
  return getCrypto().subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export type PackedCiphertext = Uint8Array<ArrayBuffer>; // [iv(12)][ciphertext]

function toArrayBufferBacked(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  if (bytes.buffer instanceof ArrayBuffer) {
    // Ensure offset/length are normalized for downstream callers.
    if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
      return bytes as Uint8Array<ArrayBuffer>;
    }
  }

  const out = new Uint8Array(new ArrayBuffer(bytes.byteLength));
  out.set(bytes);
  return out;
}

export async function encryptBytes(plaintext: Uint8Array, key: CryptoKey): Promise<PackedCiphertext> {
  const iv = new Uint8Array(new ArrayBuffer(IV_LENGTH_BYTES));
  getCrypto().getRandomValues(iv);

  const pt = toArrayBufferBacked(plaintext);
  const ciphertext = await getCrypto().subtle.encrypt({ name: 'AES-GCM', iv }, key, pt);
  return packIvAndCiphertext(iv, new Uint8Array(ciphertext));
}

export async function decryptBytes(packed: PackedCiphertext, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const { iv, ciphertext } = unpackIvAndCiphertext(packed);
  const plaintext = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    toArrayBufferBacked(ciphertext),
  );
  return new Uint8Array(plaintext);
}

export function packIvAndCiphertext(iv: Uint8Array, ciphertext: Uint8Array): PackedCiphertext {
  if (iv.byteLength !== IV_LENGTH_BYTES) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH_BYTES} bytes, got ${iv.byteLength}`);
  }

  const packed = new Uint8Array(IV_LENGTH_BYTES + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(ciphertext, IV_LENGTH_BYTES);
  return packed;
}

export function unpackIvAndCiphertext(packed: PackedCiphertext): {
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
} {
  if (packed.byteLength < IV_LENGTH_BYTES + 1) {
    throw new Error('Invalid ciphertext blob');
  }
  return {
    iv: packed.slice(0, IV_LENGTH_BYTES),
    ciphertext: packed.slice(IV_LENGTH_BYTES),
  };
}

export async function encryptText(plaintext: string, key: CryptoKey): Promise<PackedCiphertext> {
  const bytes = new TextEncoder().encode(plaintext);
  return encryptBytes(bytes, key);
}

export async function decryptText(packed: PackedCiphertext, key: CryptoKey): Promise<string> {
  const bytes = await decryptBytes(packed, key);
  return new TextDecoder().decode(bytes);
}
