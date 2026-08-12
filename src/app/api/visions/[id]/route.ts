import { NextResponse } from "next/server";
import { approvedUser } from "@/lib/auth";
import { deleteVision, getVision, updateVision } from "@/lib/visions";
import { parseVisionForm } from "@/lib/vision-form";
import type { Profile, Vision } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a vision the caller is actually allowed to change.
 *
 * Someone else's vision answers 404 rather than 403: whether a given id exists
 * is not the business of anyone who cannot touch it.
 */
async function ownedVision(
  id: string,
  user: Profile,
): Promise<Vision | null> {
  if (!UUID.test(id)) return null;
  const vision = await getVision(id);
  if (!vision || vision.user_id !== user.id) return null;
  return vision;
}

const unknown = () => NextResponse.json({ error: "Unknown vision." }, { status: 404 });

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/visions/[id]">,
) {
  const user = await approvedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await ownedVision(id, user);
  if (!existing) return unknown();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  const parsed = await parseVisionForm(form, { requireImage: false });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { title, tags, image } = parsed.value;

  try {
    const vision = await updateVision(existing, {
      id,
      title,
      tags,
      ...(image ? { image } : {}),
    });
    return NextResponse.json({ vision });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not save those changes. Try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/visions/[id]">,
) {
  const user = await approvedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await context.params;
  const vision = await ownedVision(id, user);
  if (!vision) return unknown();

  try {
    await deleteVision(vision);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not delete that vision." }, { status: 500 });
  }
}
