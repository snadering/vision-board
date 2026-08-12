import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SIGNUP_COOKIE,
  SIGNUP_MAX_AGE,
  createSessionToken,
  sign,
  timingSafeEqual,
  verify,
  type OAuthStatePayload,
  type SignupPayload,
} from "@/lib/session";
import { getProfileByEmail, getProfileByGoogleSub, claimProfile } from "@/lib/profiles";

const secure = () => process.env.NODE_ENV === "production";

function failed(origin: string, reason: string) {
  const url = new URL("/login", origin);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

/**
 * Where a Google sign-in lands.
 *
 * Three outcomes: a known account signs straight in; an account created by the
 * migration that matches on email is claimed; anybody else is sent to pick a
 * username, with their Google identity held in a short-lived signed cookie
 * rather than a server-side store.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const error = url.searchParams.get("error");
  if (error) return failed(origin, "cancelled");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return failed(origin, "incomplete");

  const statePayload = await verify<OAuthStatePayload>(state);
  const cookieNonce = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OAUTH_STATE_COOKIE}=`))
    ?.slice(OAUTH_STATE_COOKIE.length + 1);

  if (!statePayload || !cookieNonce || !timingSafeEqual(statePayload.nonce, cookieNonce)) {
    return failed(origin, "state");
  }

  let identity;
  try {
    identity = await exchangeCode(code, origin);
  } catch (thrown) {
    console.error(thrown);
    return failed(origin, "google");
  }

  const next = statePayload.next ?? "/";

  try {
    // Already known.
    let profile = await getProfileByGoogleSub(identity.sub);

    // Otherwise: an account seeded with this email, waiting to be claimed.
    // Reaching here means no profile carries this Google id, so a profile with
    // this email is either unclaimed — the migration case — or claimed by a
    // different Google account, which must never be signed into. `claimProfile`
    // only writes where google_sub is still null, so the second case fails and
    // is refused rather than quietly handing over somebody else's board.
    if (!profile) {
      const byEmail = await getProfileByEmail(identity.email);
      if (byEmail) {
        try {
          profile = await claimProfile(byEmail.id, identity);
        } catch (thrown) {
          console.error(thrown);
          return failed(origin, "conflict");
        }
      }
    }

    if (profile) {
      const destination =
        profile.status === "approved" ? next : "/pending";
      const response = NextResponse.redirect(new URL(destination, origin));
      response.cookies.set({
        name: SESSION_COOKIE,
        value: await createSessionToken(profile.id),
        httpOnly: true,
        secure: secure(),
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
      response.cookies.delete(OAUTH_STATE_COOKIE);
      return response;
    }

    // Nobody we know: hold the identity while they choose a username.
    const response = NextResponse.redirect(new URL("/welcome", origin));
    response.cookies.set({
      name: SIGNUP_COOKIE,
      value: await sign<SignupPayload>(
        {
          sub: identity.sub,
          email: identity.email,
          ...(identity.name ? { name: identity.name } : {}),
          ...(identity.picture ? { picture: identity.picture } : {}),
        },
        SIGNUP_MAX_AGE,
      ),
      httpOnly: true,
      secure: secure(),
      sameSite: "lax",
      path: "/",
      maxAge: SIGNUP_MAX_AGE,
    });
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (thrown) {
    console.error(thrown);
    return failed(origin, "server");
  }
}
