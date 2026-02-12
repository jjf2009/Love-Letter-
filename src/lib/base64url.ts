export function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBase64(base64url: string): string {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(padLength);
}

function isNodeLike(): boolean {
  return typeof window === 'undefined' && typeof Buffer !== 'undefined';
}

function bytesToBase64(bytes: Uint8Array): string {
  // Node
  if (isNodeLike()) {
    return Buffer.from(bytes).toString('base64');
  }

  // Browser
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  // Node
  if (isNodeLike()) {
    const buf = Buffer.from(base64, 'base64');
    const out = new Uint8Array(new ArrayBuffer(buf.byteLength));
    out.set(buf);
    return out;
  }

  // Browser
  const binary = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return base64ToBase64Url(bytesToBase64(bytes));
}

export function base64UrlToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  return base64ToBytes(base64UrlToBase64(base64url));
}
