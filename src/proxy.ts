import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Next 16 renamed the `middleware` file convention to `proxy`; this is the same
 * request gate the old name described. Every route falls through here except the
 * ones listed in `config.matcher` below.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  // API calls get a JSON 401 rather than an HTML redirect they cannot follow.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  // Drop an expired or tampered cookie on the way out.
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except:
     * - login (the page and its endpoint)
     * - api/keep-alive (cron, guarded by its own bearer secret)
     * - _next/static, _next/image (build output)
     * - favicon.ico, icon, opengraph-image, robots.txt (public metadata: no
     *   private data, and link previews should work when the URL is shared)
     */
    "/((?!login|api/login|api/keep-alive|_next/static|_next/image|favicon.ico|icon|opengraph-image|robots.txt).*)",
  ],
};
