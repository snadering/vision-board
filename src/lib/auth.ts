import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Proxy already blocks unauthenticated traffic, but every route and page checks
 * again: a matcher change should never be the only thing standing between the
 * internet and the data.
 */
export async function hasSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
