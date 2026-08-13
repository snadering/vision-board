import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";
import { getProfileById } from "@/lib/profiles";
import type { Profile } from "@/lib/types";

/**
 * Who is asking.
 *
 * Proxy has already checked that the cookie is validly signed, but it cannot
 * check anything about the account behind it — it runs before the database is
 * in reach. So status is enforced here, and every page and route that cares
 * calls this rather than trusting the cookie alone.
 */
export async function currentUser(): Promise<Profile | null> {
  const profile = await sessionProfile();
  if (!profile || profile.status === "blocked") return null;
  return profile;
}

/**
 * The account behind the cookie, blocked or not.
 *
 * Only for the few places that must tell "nobody is signed in" apart from
 * "this person no longer has access" — the sign-in page and the page that
 * explains the removal. Everywhere else wants `currentUser`, which treats a
 * blocked account as nobody.
 */
export async function sessionProfile(): Promise<Profile | null> {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session?.uid) return null;
  return getProfileById(session.uid);
}

/** The signed-in account, but only once you have been let in. */
export async function approvedUser(): Promise<Profile | null> {
  const profile = await currentUser();
  return profile?.status === "approved" ? profile : null;
}

export async function adminUser(): Promise<Profile | null> {
  const profile = await approvedUser();
  return profile?.is_admin ? profile : null;
}
