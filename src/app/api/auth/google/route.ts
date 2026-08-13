import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/google";
import {
  INVITE_COOKIE,
  INVITE_MAX_AGE,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  sign,
  type InvitePayload,
  type OAuthStatePayload,
} from "@/lib/session";
import { usableInvite } from "@/lib/invites";
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

  // An invite has to survive the trip to Google and back, so it rides in a
  // signed cookie rather than in the redirect. It is re-checked when the
  // account is actually created — this only remembers the claim.
  const invite = url.searchParams.get("invite");
  if (invite && (await usableInvite(invite))) {
    response.cookies.set({
      name: INVITE_COOKIE,
      value: await sign<InvitePayload>({ token: invite }, INVITE_MAX_AGE),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: INVITE_MAX_AGE,
    });
  }

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
