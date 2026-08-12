import "server-only";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import type { Vision } from "@/lib/types";

const COLUMNS =
  "id, user_id, title, image_path, image_url, width, height, tags, created_at";

export async function listVisionsFor(userId: string): Promise<Vision[]> {
  const { data, error } = await supabase()
    .from("visions")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load visions: ${error.message}`);
  return (data ?? []) as Vision[];
}

export async function getVision(id: string): Promise<Vision | null> {
  const { data, error } = await supabase()
    .from("visions")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load that vision: ${error.message}`);
  return (data as Vision) ?? null;
}

type NewVision = {
  userId: string;
  title: string;
  tags: string[];
  width: number;
  height: number;
  bytes: ArrayBuffer;
  contentType: string;
  extension: string;
};

export async function createVision(input: NewVision): Promise<Vision> {
  const db = supabase();
  const path = `${input.userId}/${crypto.randomUUID()}.${input.extension}`;

  const upload = await db.storage.from(STORAGE_BUCKET).upload(path, input.bytes, {
    contentType: input.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) throw new Error(`Upload failed: ${upload.error.message}`);

  const {
    data: { publicUrl },
  } = db.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const { data, error } = await db
    .from("visions")
    .insert({
      user_id: input.userId,
      title: input.title,
      image_path: path,
      image_url: publicUrl,
      width: input.width,
      height: input.height,
      tags: input.tags,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    // Never leave an orphaned object behind a failed insert.
    await db.storage.from(STORAGE_BUCKET).remove([path]);
    throw new Error(`Could not save vision: ${error?.message ?? "no row returned"}`);
  }

  return data as Vision;
}

type VisionUpdate = {
  id: string;
  title: string;
  tags: string[];
  /** Omitted when the photo is being kept as it is. */
  image?: {
    bytes: ArrayBuffer;
    contentType: string;
    extension: string;
    width: number;
    height: number;
  };
};

/**
 * Callers must have already established that this vision belongs to the person
 * asking — see `ownedVision` in the route.
 *
 * A replaced photo is uploaded before the row is touched and the old object is
 * removed only once the update has succeeded, so the record never points at a
 * missing file, and a failed update leaves the original photo intact.
 */
export async function updateVision(
  existing: Vision,
  input: VisionUpdate,
): Promise<Vision> {
  const db = supabase();
  const patch: Record<string, unknown> = { title: input.title, tags: input.tags };

  let uploadedPath: string | null = null;
  if (input.image) {
    uploadedPath = `${existing.user_id}/${crypto.randomUUID()}.${input.image.extension}`;

    const upload = await db.storage
      .from(STORAGE_BUCKET)
      .upload(uploadedPath, input.image.bytes, {
        contentType: input.image.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (upload.error) throw new Error(`Upload failed: ${upload.error.message}`);

    const {
      data: { publicUrl },
    } = db.storage.from(STORAGE_BUCKET).getPublicUrl(uploadedPath);

    patch.image_path = uploadedPath;
    patch.image_url = publicUrl;
    patch.width = input.image.width;
    patch.height = input.image.height;
  }

  const { data, error } = await db
    .from("visions")
    .update(patch)
    .eq("id", input.id)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    if (uploadedPath) await db.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
    throw new Error(`Could not save changes: ${error?.message ?? "no row returned"}`);
  }

  if (uploadedPath && existing.image_path !== uploadedPath) {
    await db.storage.from(STORAGE_BUCKET).remove([existing.image_path]);
  }

  return data as Vision;
}

export async function deleteVision(vision: Vision): Promise<void> {
  const db = supabase();

  const { error } = await db.from("visions").delete().eq("id", vision.id);
  if (error) throw new Error(`Could not delete that vision: ${error.message}`);

  // The row is the source of truth; a failed object removal leaves a stray file
  // but is not worth failing the request over.
  await db.storage.from(STORAGE_BUCKET).remove([vision.image_path]);
}
