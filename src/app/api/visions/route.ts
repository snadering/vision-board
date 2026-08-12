import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { createVision, listVisions } from "@/lib/visions";
import {
  ACCEPTED_UPLOAD_MIME,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  UPLOAD_EXTENSION,
  isOwner,
} from "@/lib/types";

const unauthorized = () =>
  NextResponse.json({ error: "Not authenticated" }, { status: 401 });

const invalid = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export async function GET() {
  if (!(await hasSession())) return unauthorized();

  try {
    return NextResponse.json({ visions: await listVisions() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load visions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await hasSession())) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return invalid("Malformed upload.");
  }

  const title = String(form.get("title") ?? "").trim();
  if (title.length < 1 || title.length > MAX_TITLE_LENGTH) {
    return invalid(`Title must be between 1 and ${MAX_TITLE_LENGTH} characters.`);
  }

  const owner = form.get("owner");
  if (!isOwner(owner)) return invalid("Pick whose vision this is.");

  let tags: string[] = [];
  const rawTags = form.get("tags");
  if (typeof rawTags === "string" && rawTags.length > 0) {
    try {
      const parsed: unknown = JSON.parse(rawTags);
      if (!Array.isArray(parsed)) return invalid("Tags must be a list.");
      tags = parsed.map((tag) => String(tag).trim()).filter(Boolean);
    } catch {
      return invalid("Tags must be a list.");
    }
  }
  if (tags.length > MAX_TAGS) return invalid(`At most ${MAX_TAGS} keywords.`);
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    return invalid(`Keywords must be ${MAX_TAG_LENGTH} characters or fewer.`);
  }

  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    return invalid("Missing image dimensions.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return invalid("An image is required.");
  if (file.size === 0) return invalid("The image is empty.");
  if (file.size > MAX_UPLOAD_BYTES) {
    return invalid("That image is still too large after optimising.");
  }

  const contentType = file.type;
  if (!(ACCEPTED_UPLOAD_MIME as readonly string[]).includes(contentType)) {
    return invalid("Unsupported image format.");
  }

  try {
    const vision = await createVision({
      owner,
      title,
      tags,
      width,
      height,
      bytes: await file.arrayBuffer(),
      contentType,
      extension: UPLOAD_EXTENSION[contentType] ?? "webp",
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
