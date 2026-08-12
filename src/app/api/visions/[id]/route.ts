import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { deleteVision, updateVision } from "@/lib/visions";
import { parseVisionForm } from "@/lib/vision-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const unauthorized = () =>
  NextResponse.json({ error: "Not authenticated" }, { status: 401 });

const unknown = () => NextResponse.json({ error: "Unknown vision." }, { status: 404 });

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/visions/[id]">,
) {
  if (!(await hasSession())) return unauthorized();

  const { id } = await context.params;
  if (!UUID.test(id)) return unknown();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  // The image is optional here: no file means the photo stays as it is.
  const parsed = await parseVisionForm(form, { requireImage: false });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { title, owner, tags, image } = parsed.value;

  try {
    const vision = await updateVision({
      id,
      owner,
      title,
      tags,
      ...(image ? { image } : {}),
    });
    if (!vision) return unknown();
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
  if (!(await hasSession())) return unauthorized();

  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Unknown vision." }, { status: 400 });
  }

  try {
    const deleted = await deleteVision(id);
    if (!deleted) return unknown();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not delete that vision." }, { status: 500 });
  }
}
