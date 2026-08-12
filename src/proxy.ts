import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

/**
 * The site is open now: the directory and public boards are readable by anyone,
 * so this only guards the routes that write or reveal something.
 *
 * All it can check is that a session cookie is validly signed — it runs before
 * the database is in reach, so whether that account is approved, blocked or
 * allowed to see a particular board is decided by the page or route itself.
 * This is a cheap first gate, never the only one.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (session?.uid) return NextResponse.next();

  const { pathname } = request.nextUrl;

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
    // Signed-in areas.
    "/settings/:path*",
    "/admin/:path*",
    // Write endpoints. Everything readable — the directory, public boards, the
    // sign-in dance — is deliberately absent.
    "/api/visions/:path*",
    "/api/profile/:path*",
    "/api/admin/:path*",
  ],
};
