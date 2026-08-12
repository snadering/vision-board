/** A row of the `profiles` table, as sent to the browser. */
export type Profile = {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  avatar_path: string | null;
  board_public: boolean;
  status: ProfileStatus;
  is_admin: boolean;
  created_at: string;
};

export const PROFILE_STATUSES = ["pending", "approved", "blocked"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/**
 * What the directory needs to draw a person: everything public about them, plus
 * how many visions they have, which decides how large their card is drawn.
 */
export type DirectoryEntry = {
  id: string;
  username: string;
  avatar_url: string | null;
  board_public: boolean;
  vision_count: number;
};

/** A row of the `visions` table, as sent to the browser. */
export type Vision = {
  id: string;
  user_id: string;
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

export const MIN_USERNAME_LENGTH = 2;
export const MAX_USERNAME_LENGTH = 24;
/** Usernames appear in URLs, so keep them to a shape that survives one. */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,23}$/;

/** Names nobody may take, because they are (or may become) routes. */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "login",
  "logout",
  "settings",
  "welcome",
  "pending",
  "u",
  "about",
  "help",
  "support",
  "new",
  "me",
  "board",
  "boards",
  "profile",
  "profiles",
  "static",
  "public",
  "robots",
  "sitemap",
]);

export function usernameProblem(value: string): string | null {
  const username = value.trim().toLowerCase();
  if (username.length < MIN_USERNAME_LENGTH) {
    return "A little longer, please.";
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return `At most ${MAX_USERNAME_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Lowercase letters, numbers, dashes and underscores, starting with a letter or number.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "That one's spoken for.";
  }
  return null;
}

/** Vercel caps a serverless request body at ~4.5 MB; the client resizes below this. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** Anything larger is rejected before decoding, so a huge file can't stall the tab. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
/** Longest edge after client-side downscaling. */
export const MAX_EDGE = 2400;
/** Avatars are square and small; no reason to keep more. */
export const AVATAR_EDGE = 512;

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
