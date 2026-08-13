import { NextResponse } from "next/server";
import { adminUser } from "@/lib/auth";
import { createInvite } from "@/lib/invites";

export async function POST(request: Request) {
  const admin = await adminUser();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  let label: string | undefined;
  try {
    const body = (await request.json()) as { label?: unknown };
    if (typeof body.label === "string") label = body.label.slice(0, 60);
  } catch {
    // A label is optional; a malformed body just means none.
  }

  try {
    return NextResponse.json({ invite: await createInvite(admin.id, label) }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not make a link." }, { status: 500 });
  }
}
