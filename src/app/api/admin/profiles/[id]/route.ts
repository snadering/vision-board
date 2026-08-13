import { NextResponse } from "next/server";
import { adminUser } from "@/lib/auth";
import {
  deleteProfileCompletely,
  getProfileById,
  mergeSignupIntoProfile,
  updateProfile,
} from "@/lib/profiles";

/**
 * Approve, block, or link a new signup onto a profile that was created by the
 * migration and is still waiting for its owner.
 *
 * Linking exists because the two original boards predate accounts: Jessica's
 * visions are attached to a profile nobody has ever signed into, and this is
 * how the person who signs up gets handed that history instead of an empty
 * board.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/profiles/[id]">,
) {
  const admin = await adminUser();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await context.params;

  let action = "";
  let mergeInto = "";
  try {
    const body = (await request.json()) as { action?: unknown; mergeInto?: unknown };
    if (typeof body.action === "string") action = body.action;
    if (typeof body.mergeInto === "string") mergeInto = body.mergeInto;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const profile = await getProfileById(id);
  if (!profile) {
    return NextResponse.json({ error: "Unknown account." }, { status: 404 });
  }

  try {
    if (action === "approve") {
      return NextResponse.json({
        profile: await updateProfile(id, { status: "approved" }),
      });
    }

    if (action === "block") {
      if (profile.is_admin) {
        return NextResponse.json(
          { error: "Administrators cannot be blocked." },
          { status: 400 },
        );
      }
      return NextResponse.json({
        profile: await updateProfile(id, { status: "blocked" }),
      });
    }

    if (action === "merge") {
      const target = await getProfileById(mergeInto);
      if (!target) {
        return NextResponse.json({ error: "Unknown account." }, { status: 404 });
      }
      return NextResponse.json({
        profile: await mergeSignupIntoProfile(profile.id, target.id),
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not do that." }, { status: 500 });
  }
}

/**
 * Deletes an account outright.
 *
 * The caller must send the username back, and it must match the account being
 * deleted. That makes a mistargeted request — a stale page, a wrong id — fail
 * instead of destroying the wrong person's board.
 */
export async function DELETE(
  request: Request,
  context: RouteContext<"/api/admin/profiles/[id]">,
) {
  const admin = await adminUser();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { id } = await context.params;

  const profile = await getProfileById(id);
  if (!profile) {
    return NextResponse.json({ error: "Unknown account." }, { status: 404 });
  }
  if (profile.is_admin) {
    return NextResponse.json(
      { error: "Administrators cannot be deleted." },
      { status: 400 },
    );
  }
  if (profile.id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    );
  }

  const confirm = new URL(request.url).searchParams.get("confirm");
  if (confirm?.trim().toLowerCase() !== profile.username.toLowerCase()) {
    return NextResponse.json(
      { error: "That name does not match the account." },
      { status: 400 },
    );
  }

  try {
    const removed = await deleteProfileCompletely(id);
    return NextResponse.json({ ok: true, ...removed });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not delete that account." }, { status: 500 });
  }
}
