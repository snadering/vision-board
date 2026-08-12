import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE, SIGNUP_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of [SESSION_COOKIE, SIGNUP_COOKIE, OAUTH_STATE_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
