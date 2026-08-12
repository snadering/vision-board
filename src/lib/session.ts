/**
 * Signed session cookie.
 *
 * A single shared password gates the site, so the cookie carries no identity —
 * only an expiry, HMAC-SHA256 signed with SESSION_SECRET. Web Crypto is used
 * throughout so the exact same module runs in Proxy (Node runtime), Route
 * Handlers and Server Components without a second implementation.
 */

export const SESSION_COOKIE = "vb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days, in seconds

type SessionPayload = {
  /** Unix seconds. */
  exp: number;
  /** Payload version, so the format can change without silently validating. */
  v: 1;
};

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

async function signingKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Constant-time string comparison. Length is allowed to leak — the values
 * compared here are a password and a signature, where length is not the secret.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  // Compare against a same-length buffer so the loop always runs to completion.
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return mismatch === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const payload: SessionPayload = {
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE,
    v: 1,
  };
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    encoder.encode(body),
  );
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [body, signature] = parts;
  if (!body || !signature) return false;

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      base64UrlDecode(signature),
      encoder.encode(body),
    );
  } catch {
    return false;
  }
  if (!valid) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(body)),
    ) as SessionPayload;
    if (payload.v !== 1) return false;
    return typeof payload.exp === "number" && payload.exp * 1000 > now;
  } catch {
    return false;
  }
}
