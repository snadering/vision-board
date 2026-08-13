import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

/**
 * Nothing is readable without a session: not a board, not the directory, not
 * even who else is here. The only exceptions are the way in and the assets a
 * browser needs to render it.
 *
 * All this can check is that the session cookie is validly signed — it runs
 * before the database is in reach, so whether the account is approved, blocked,
 * or allowed to see a particular board is settled by the page or route itself.
 * A cheap first gate, never the only one.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (session?.uid) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // The root renders its own signed-out landing rather than bouncing, so the
  // site has a front door instead of an immediate redirect.
  if (pathname === "/") return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  const response = NextResponse.redirect(loginUrl);
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except:
     * - login and the Google round trip (the way in)
     * - join, an invite link, which is followed by people who have no account
     *   at all — the token in the URL is the whole credential
     * - welcome, where somebody who has just signed in with Google picks a
     *   username. They hold a signup cookie but no session yet, so gating on a
     *   session here would make joining impossible. That page guards itself:
     *   without a valid signup cookie it sends you to /login.
     * - api/keep-alive (cron, guarded by its own bearer secret)
     * - _next/static, _next/image (build output)
     * - favicon.ico, icon, opengraph-image, robots.txt (metadata: no private
     *   data, and link previews should survive being shared)
     */
    "/((?!login|join|welcome|api/auth|api/keep-alive|_next/static|_next/image|favicon.ico|icon|opengraph-image|robots.txt).*)",
  ],
};
