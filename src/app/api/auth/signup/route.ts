import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SIGNUP_COOKIE,
  createSessionToken,
  verify,
  type SignupPayload,
} from "@/lib/session";
import { cookies } from "next/headers";
import {
  createProfile,
  importGoogleAvatar,
  updateProfile,
  usernameTaken,
} from "@/lib/profiles";
import { usernameProblem } from "@/lib/types";

/**
 * Finishes a sign-up: turns the held Google identity plus a chosen username
 * into a pending account, and signs the person in so they can watch for
 * approval.
 */
export async function POST(request: Request) {
  const store = await cookies();
  const signup = await verify<SignupPayload>(store.get(SIGNUP_COOKIE)?.value);
  if (!signup) {
    return NextResponse.json(
      { error: "That sign-in has expired. Please start again." },
      { status: 401 },
    );
  }

  let username = "";
  try {
    const body = (await request.json()) as { username?: unknown };
    if (typeof body.username === "string") username = body.username.trim().toLowerCase();
  } catch {
    // Handled by the validation below.
  }

  const problem = usernameProblem(username);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  if (await usernameTaken(username)) {
    return NextResponse.json({ error: "That name is taken." }, { status: 409 });
  }

  try {
    const profile = await createProfile({
      username,
      email: signup.email,
      googleSub: signup.sub,
    });

    // Best effort, and deliberately after the account exists: no avatar is a
    // perfectly good account, and Google being slow should not fail a sign-up.
    if (signup.picture) {
      const avatar = await importGoogleAvatar(profile.id, signup.picture);
      if (avatar) {
        await updateProfile(profile.id, {
          avatar_url: avatar.url,
          avatar_path: avatar.path,
        });
      }
    }

    const response = NextResponse.json({ ok: true, username: profile.username });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: await createSessionToken(profile.id),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    response.cookies.delete(SIGNUP_COOKIE);
    return response;
  } catch (thrown) {
    console.error(thrown);
    return NextResponse.json(
      { error: "Could not create that account." },
      { status: 500 },
    );
  }
}
