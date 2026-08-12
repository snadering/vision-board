import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/google";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  sign,
  type OAuthStatePayload,
} from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Starts the sign-in: sets a one-time state and hands off to Google. */
export async function GET(request: Request) {
  const limit = rateLimit(`oauth:${clientIp(request)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const origin = url.origin;

  // Where to land afterwards. Only same-site paths, so this cannot be used to
  // bounce somebody to another host after signing in.
  const requested = url.searchParams.get("next");
  const next =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : undefined;

  const nonce = crypto.randomUUID();
  const state = await sign<OAuthStatePayload>(
    { nonce, ...(next ? { next } : {}) },
    OAUTH_STATE_MAX_AGE,
  );

  const response = NextResponse.redirect(authorizeUrl(origin, state));
  // The same nonce, in a cookie: the callback requires both halves to agree,
  // which is what stops somebody else's sign-in being replayed at you.
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: nonce,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE,
  });
  return response;
}
