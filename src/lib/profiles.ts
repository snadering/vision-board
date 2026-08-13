import "server-only";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import type { DirectoryEntry, Profile, ProfileStatus } from "@/lib/types";

const COLUMNS =
  "id, username, email, avatar_url, avatar_path, board_public, status, is_admin, created_at";

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase()
    .from("profiles")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return (data as Profile) ?? null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase()
    .from("profiles")
    .select(COLUMNS)
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return (data as Profile) ?? null;
}

export async function getProfileByGoogleSub(sub: string): Promise<Profile | null> {
  const { data, error } = await supabase()
    .from("profiles")
    .select(COLUMNS)
    .eq("google_sub", sub)
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return (data as Profile) ?? null;
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await supabase()
    .from("profiles")
    .select(COLUMNS)
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return (data as Profile) ?? null;
}

export async function usernameTaken(username: string): Promise<boolean> {
  return (await getProfileByUsername(username)) !== null;
}

/**
 * Everyone approved *and claimed*, with their vision counts.
 *
 * A profile with no `google_sub` is a board waiting for its owner — created by
 * the migration, not by a person signing in — and showing one in the directory
 * would put somebody on the front page who has never been here. They appear the
 * moment they first sign in.
 *
 * The counts are tallied in memory from a single id-only query rather than a
 * grouped one, which is the right trade at this size — it is one round trip and
 * a handful of kilobytes. If the board ever holds tens of thousands of visions,
 * this becomes a view.
 */
export async function listDirectory(): Promise<DirectoryEntry[]> {
  const db = supabase();

  const [{ data: profiles, error }, { data: visions, error: visionError }] =
    await Promise.all([
      db
        .from("profiles")
        .select("id, username, avatar_url, board_public")
        .eq("status", "approved")
        .not("google_sub", "is", null)
        .order("created_at", { ascending: true }),
      db.from("visions").select("user_id"),
    ]);

  if (error) throw new Error(`Could not load the directory: ${error.message}`);
  if (visionError) throw new Error(`Could not count visions: ${visionError.message}`);

  const counts = new Map<string, number>();
  for (const row of (visions ?? []) as { user_id: string | null }[]) {
    if (row.user_id) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  return ((profiles ?? []) as Omit<DirectoryEntry, "vision_count">[]).map(
    (profile) => ({ ...profile, vision_count: counts.get(profile.id) ?? 0 }),
  );
}

export async function listByStatus(status: ProfileStatus): Promise<Profile[]> {
  const { data, error } = await supabase()
    .from("profiles")
    .select(COLUMNS)
    .eq("status", status)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load profiles: ${error.message}`);
  return (data ?? []) as Profile[];
}

/** Profiles created by the migration that nobody has signed into yet. */
export async function listUnclaimed(): Promise<Profile[]> {
  const { data, error } = await supabase()
    .from("profiles")
    .select(COLUMNS)
    .is("google_sub", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load profiles: ${error.message}`);
  return (data ?? []) as Profile[];
}

type NewProfile = {
  username: string;
  email: string;
  googleSub: string;
  avatarUrl?: string | null;
  avatarPath?: string | null;
};

export async function createProfile(input: NewProfile): Promise<Profile> {
  const { data, error } = await supabase()
    .from("profiles")
    .insert({
      username: input.username.toLowerCase(),
      email: input.email.toLowerCase(),
      google_sub: input.googleSub,
      avatar_url: input.avatarUrl ?? null,
      avatar_path: input.avatarPath ?? null,
      status: "pending",
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Could not create that account: ${error?.message ?? "no row"}`);
  }
  return data as Profile;
}

/** Attaches a Google identity to a profile that was waiting for its owner. */
export async function claimProfile(
  id: string,
  identity: { sub: string; email: string },
): Promise<Profile> {
  const { data, error } = await supabase()
    .from("profiles")
    .update({ google_sub: identity.sub, email: identity.email.toLowerCase() })
    .eq("id", id)
    .is("google_sub", null)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Could not link that account: ${error?.message ?? "already claimed"}`);
  }
  return data as Profile;
}

/**
 * Hands a fresh signup the history of an account that predates sign-in.
 *
 * The legacy profile is the one that survives: existing visions point at its id
 * and its username is the one people already know, so the Google identity moves
 * onto it and the just-created signup row is removed. Any visions the signup
 * managed to create first are carried across rather than cascaded away with it.
 */
export async function mergeSignupIntoProfile(
  signupId: string,
  legacyId: string,
): Promise<Profile> {
  const db = supabase();

  const { data: signup, error: signupError } = await db
    .from("profiles")
    .select("id, google_sub, email, avatar_url, avatar_path")
    .eq("id", signupId)
    .maybeSingle();
  if (signupError) throw new Error(`Could not read that signup: ${signupError.message}`);
  if (!signup) throw new Error("That signup no longer exists");

  const { data: legacy, error: legacyError } = await db
    .from("profiles")
    .select("id, google_sub, avatar_url, avatar_path")
    .eq("id", legacyId)
    .maybeSingle();
  if (legacyError) throw new Error(`Could not read that account: ${legacyError.message}`);
  if (!legacy) throw new Error("That account no longer exists");
  if (legacy.google_sub) throw new Error("That account already belongs to someone");

  // Carry over anything the new account made before being linked.
  const { error: moveError } = await db
    .from("visions")
    .update({ user_id: legacyId })
    .eq("user_id", signupId);
  if (moveError) throw new Error(`Could not move visions: ${moveError.message}`);

  const { data, error } = await db
    .from("profiles")
    .update({
      google_sub: signup.google_sub,
      email: signup.email,
      status: "approved",
      // Keep whatever picture the legacy account already had.
      avatar_url: legacy.avatar_url ?? signup.avatar_url,
      avatar_path: legacy.avatar_path ?? signup.avatar_path,
    })
    .eq("id", legacyId)
    .is("google_sub", null)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Could not link that account: ${error?.message ?? "already claimed"}`);
  }

  // Only once the identity has moved, so a failure above leaves both rows.
  const { error: deleteError } = await db.from("profiles").delete().eq("id", signupId);
  if (deleteError) {
    console.error(`Merged into ${legacyId} but could not remove ${signupId}`, deleteError);
  }

  return data as Profile;
}

export async function updateProfile(
  id: string,
  patch: Partial<{
    username: string;
    board_public: boolean;
    status: ProfileStatus;
    avatar_url: string | null;
    avatar_path: string | null;
  }>,
): Promise<Profile> {
  const { data, error } = await supabase()
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Could not save that: ${error?.message ?? "no row returned"}`);
  }
  return data as Profile;
}

/**
 * Stores an avatar and returns its public URL. Replacing one removes the old
 * object afterwards, so a person's avatars do not accumulate in the bucket.
 */
export async function storeAvatar(
  profileId: string,
  bytes: ArrayBuffer,
  contentType: string,
  extension: string,
  previousPath?: string | null,
): Promise<{ url: string; path: string }> {
  const db = supabase();
  const path = `avatars/${profileId}/${crypto.randomUUID()}.${extension}`;

  const upload = await db.storage.from(STORAGE_BUCKET).upload(path, bytes, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) throw new Error(`Upload failed: ${upload.error.message}`);

  const {
    data: { publicUrl },
  } = db.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  if (previousPath && previousPath !== path) {
    await db.storage.from(STORAGE_BUCKET).remove([previousPath]);
  }

  return { url: publicUrl, path };
}

/**
 * Copies the picture Google offers into our own bucket. Best-effort: an account
 * without an avatar is fine, and it can always be uploaded later, so a failure
 * here must never block somebody signing up.
 */
export async function importGoogleAvatar(
  profileId: string,
  pictureUrl: string,
): Promise<{ url: string; path: string } | null> {
  try {
    // Google hands out a 96px thumbnail by default, encoded as an "=s96-c"
    // suffix. Asking for the same picture at 512 costs nothing and is the
    // difference between a crisp avatar and an upscaled one.
    const wanted = pictureUrl.replace(/=s\d+(-c)?$/, "=s512-c");

    const response = await fetch(wanted);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 4 * 1024 * 1024) return null;

    const extension = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";

    return await storeAvatar(profileId, bytes, contentType, extension);
  } catch {
    return null;
  }
}
