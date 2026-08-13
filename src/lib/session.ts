/**
 * Signed cookies.
 *
 * Two of them: the long-lived session that says which account you are, and a
 * short-lived signup ticket that carries a Google identity across the moment
 * between "signed in with Google" and "picked a username". Both are HMAC-SHA256
 * signed with SESSION_SECRET via Web Crypto, so the same module runs in Proxy
 * (Node runtime), Route Handlers and Server Components alike.
 *
 * Nothing here touches the database: Proxy imports it on every request, and must
 * stay a pure signature check.
 */

export const SESSION_COOKIE = "vb_session";
export const SIGNUP_COOKIE = "vb_signup";
export const OAUTH_STATE_COOKIE = "vb_oauth";
/** Remembers which invite link somebody arrived through, across Google. */
export const INVITE_COOKIE = "vb_invite";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days
export const SIGNUP_MAX_AGE = 60 * 15; // long enough to choose a username
export const OAUTH_STATE_MAX_AGE = 60 * 10;
export const INVITE_MAX_AGE = 60 * 30;

/** What the session cookie carries: an account id and nothing else. */
export type SessionPayload = { uid: string };

/** The Google identity, held only until a username is chosen. */
export type SignupPayload = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export type OAuthStatePayload = { nonce: string; next?: string };

export type InvitePayload = { token: string };

type Envelope<T> = T & { exp: number; v: 2 };

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
 * compared here are secrets whose length is not the secret.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return mismatch === 0;
}

export async function sign<T extends object>(
  payload: T,
  maxAgeSeconds: number,
  now = Date.now(),
): Promise<string> {
  const envelope: Envelope<T> = {
    ...payload,
    exp: Math.floor(now / 1000) + maxAgeSeconds,
    v: 2,
  };
  const body = base64UrlEncode(encoder.encode(JSON.stringify(envelope)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    encoder.encode(body),
  );
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Returns the payload, or null if the token is forged, malformed or expired. */
export async function verify<T>(
  token: string | undefined | null,
  now = Date.now(),
): Promise<T | null> {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      base64UrlDecode(signature),
      encoder.encode(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(body)),
    ) as Envelope<T>;

    if (payload.v !== 2) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
    return payload as T;
  } catch {
    return null;
  }
}

export const createSessionToken = (uid: string) =>
  sign<SessionPayload>({ uid }, SESSION_MAX_AGE);

export const readSessionToken = (token: string | undefined | null) =>
  verify<SessionPayload>(token);
