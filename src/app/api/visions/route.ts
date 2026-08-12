import { NextResponse } from "next/server";
import { approvedUser } from "@/lib/auth";
import { createVision, listVisionsFor } from "@/lib/visions";
import { parseVisionForm } from "@/lib/vision-form";

/** Your own visions. Other people's boards are rendered server-side. */
export async function GET() {
  const user = await approvedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    return NextResponse.json({ visions: await listVisionsFor(user.id) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load visions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await approvedUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Malformed upload." }, { status: 400 });
  }

  const parsed = await parseVisionForm(form, { requireImage: true });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { title, tags, image } = parsed.value;

  try {
    // A vision belongs to whoever is signed in; there is no owner field to send,
    // and therefore nothing a caller could claim to be.
    const vision = await createVision({
      userId: user.id,
      title,
      tags,
      width: image!.width,
      height: image!.height,
      bytes: image!.bytes,
      contentType: image!.contentType,
      extension: image!.extension,
    });
    return NextResponse.json({ vision }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not save that vision. Try again." },
      { status: 500 },
    );
  }
}
