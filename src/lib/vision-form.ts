import {
  ACCEPTED_UPLOAD_MIME,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_UPLOAD_BYTES,
  UPLOAD_EXTENSION,
} from "@/lib/types";

/**
 * Shared parsing and validation for the create and edit endpoints. On edit the
 * image is optional — leaving it out keeps the photo already on the record.
 *
 * There is no owner field: a vision belongs to whoever is signed in, decided by
 * the route from the session rather than by anything the client sends.
 */

export type ParsedImage = {
  bytes: ArrayBuffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
};

export type ParsedVisionForm = {
  title: string;
  tags: string[];
  image: ParsedImage | null;
};

export type ParseResult =
  | { ok: true; value: ParsedVisionForm }
  | { ok: false; error: string };

export async function parseVisionForm(
  form: FormData,
  { requireImage }: { requireImage: boolean },
): Promise<ParseResult> {
  const fail = (error: string): ParseResult => ({ ok: false, error });

  const title = String(form.get("title") ?? "").trim();
  if (title.length < 1 || title.length > MAX_TITLE_LENGTH) {
    return fail(`Title must be between 1 and ${MAX_TITLE_LENGTH} characters.`);
  }

  let tags: string[] = [];
  const rawTags = form.get("tags");
  if (typeof rawTags === "string" && rawTags.length > 0) {
    try {
      const parsed: unknown = JSON.parse(rawTags);
      if (!Array.isArray(parsed)) return fail("Tags must be a list.");
      tags = parsed.map((tag) => String(tag).trim()).filter(Boolean);
    } catch {
      return fail("Tags must be a list.");
    }
  }
  if (tags.length > MAX_TAGS) return fail(`At most ${MAX_TAGS} keywords.`);
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    return fail(`Keywords must be ${MAX_TAG_LENGTH} characters or fewer.`);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    if (requireImage) return fail("An image is required.");
    return { ok: true, value: { title, tags, image: null } };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("That image is still too large after optimising.");
  }

  const contentType = file.type;
  if (!(ACCEPTED_UPLOAD_MIME as readonly string[]).includes(contentType)) {
    return fail("Unsupported image format.");
  }

  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    return fail("Missing image dimensions.");
  }

  return {
    ok: true,
    value: {
      title,
      tags,
      image: {
        bytes: await file.arrayBuffer(),
        contentType,
        extension: UPLOAD_EXTENSION[contentType] ?? "webp",
        width,
        height,
      },
    },
  };
}
