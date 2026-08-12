import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { timingSafeEqual } from "@/lib/session";

/**
 * Daily cron target. Writing a row keeps the Supabase project out of its 7-day
 * inactivity pause. Guarded by CRON_SECRET rather than the session cookie,
 * because Vercel's scheduler has no cookie.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const header = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const { error } = await supabase()
    .from("heartbeat")
    .update({ pinged_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() });
}
