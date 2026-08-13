import { NextResponse } from "next/server";
import { adminUser } from "@/lib/auth";
import { revokeInvite } from "@/lib/invites";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/invites/[id]">,
) {
  const admin = await adminUser();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await context.params;

  let revoked = true;
  try {
    const body = (await request.json()) as { revoked?: unknown };
    if (typeof body.revoked === "boolean") revoked = body.revoked;
  } catch {
    // Default to closing the link, which is the action worth being easy.
  }

  try {
    return NextResponse.json({ invite: await revokeInvite(id, revoked) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not change that link." }, { status: 500 });
  }
}
