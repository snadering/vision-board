/**
 * Card variants are derived from the stored public URL by string surgery rather
 * than from an env var, so the Supabase project URL never has to be inlined into
 * a client bundle to build them.
 */

const OBJECT_SEGMENT = "/storage/v1/object/public/";
const RENDER_SEGMENT = "/storage/v1/render/image/public/";

/**
 * A width-constrained variant served by Supabase's image transformation
 * endpoint. If the project has transformations disabled the request 400s, and
 * the card falls back to `publicUrl` (see `VisionCard`).
 *
 * `resize=contain` is not optional. Given a width alone the endpoint keeps the
 * source height, so a 1200×900 photo asked for at 800 comes back 800×900 —
 * squashed, not scaled. `contain` scales to fit the width and keeps the aspect
 * ratio, without needing to know the source dimensions, which matters for
 * avatars where those are not stored.
 */
export function cardImageUrl(publicUrl: string, width = 800): string {
  if (!publicUrl.includes(OBJECT_SEGMENT)) return publicUrl;
  return `${publicUrl.replace(OBJECT_SEGMENT, RENDER_SEGMENT)}?width=${width}&resize=contain&quality=75`;
}

/**
 * A 1×1 near-black pixel. Blurred up by `next/image` it reads as a soft dark
 * plate the size of the card, which suits the room better than a grey box.
 */
export const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQBLhWpjAAAAAElFTkSuQmCC";
