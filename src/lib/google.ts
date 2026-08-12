import "server-only";

/**
 * Google sign-in, as a plain OAuth 2.0 authorization-code flow.
 *
 * Done directly rather than through an auth library so the session model built
 * for this app stays the only one: Google is asked who you are, and the answer
 * is turned into our own signed cookie immediately.
 */

const AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

export type GoogleIdentity = {
  /** Google's stable id for this account — the thing worth storing. */
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

/** Must match a redirect URI registered on the Google credential exactly. */
export function redirectUri(origin: string): string {
  return `${origin}/api/auth/callback`;
}

export function authorizeUrl(origin: string, state: string): string {
  const { clientId } = credentials();
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  // Google only returns a refresh token on first consent, and we want none:
  // the identity is exchanged once and never used again.
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

type TokenResponse = { id_token?: string; error?: string };

type IdTokenClaims = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  aud?: string;
  iss?: string;
  exp?: number;
};

function decodeSegment(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Trades the one-time code for an identity.
 *
 * The ID token's signature is not verified, and does not need to be: it comes
 * straight back from Google's token endpoint over TLS in a server-to-server
 * call authenticated with our client secret, which is the case Google's own
 * documentation exempts. The claims that guard against a token meant for
 * somebody else — audience, issuer and expiry — are checked.
 */
export async function exchangeCode(
  code: string,
  origin: string,
): Promise<GoogleIdentity> {
  const { clientId, clientSecret } = credentials();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });

  const payload = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!response.ok || !payload?.id_token) {
    throw new Error(`Google rejected the sign-in (${payload?.error ?? response.status})`);
  }

  const segment = payload.id_token.split(".")[1];
  if (!segment) throw new Error("Google returned a malformed token");

  const claims = decodeSegment(segment) as IdTokenClaims;

  if (claims.aud !== clientId) throw new Error("Token was issued for another app");
  if (!claims.iss || !ISSUERS.has(claims.iss)) throw new Error("Untrusted token issuer");
  if (!claims.exp || claims.exp * 1000 <= Date.now()) throw new Error("Token has expired");
  if (!claims.sub || !claims.email) throw new Error("Google returned no identity");
  if (claims.email_verified === false) {
    throw new Error("That Google account has an unverified email address");
  }

  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    name: claims.name,
    picture: claims.picture,
  };
}
