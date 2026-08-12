import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { createVision, listVisions } from "@/lib/visions";
import { parseVisionForm } from "@/lib/vision-form";

export async function GET() {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    return NextResponse.json({ visions: await listVisions() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load visions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await hasSession())) {
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
  const { title, owner, tags, image } = parsed.value;

  try {
    const vision = await createVision({
      owner,
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
