export const OWNERS = ["sander", "jessica"] as const;

export type Owner = (typeof OWNERS)[number];

export const OWNER_LABELS: Record<Owner, string> = {
  sander: "Sander",
  jessica: "Jessica",
};

export function isOwner(value: unknown): value is Owner {
  return typeof value === "string" && (OWNERS as readonly string[]).includes(value);
}

/** A row of the `visions` table, exactly as it is sent to the browser. */
export type Vision = {
  id: string;
  owner: Owner;
  title: string;
  image_path: string;
  image_url: string;
  width: number;
  height: number;
  tags: string[];
  created_at: string;
};

export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 24;
export const MAX_TITLE_LENGTH = 80;
/** Vercel caps a serverless request body at ~4.5 MB; the client resizes below this. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Anything larger is rejected before decoding, so a huge file can't stall the tab. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
/** Longest edge after client-side downscaling. */
export const MAX_EDGE = 2400;

export const ACCEPTED_INPUT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const ACCEPTED_INPUT_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
] as const;

/** What the server accepts *after* the browser has re-encoded the file. */
export const ACCEPTED_UPLOAD_MIME = ["image/webp", "image/jpeg", "image/png"] as const;

export const UPLOAD_EXTENSION: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};
