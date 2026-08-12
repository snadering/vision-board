import "server-only";
import { STORAGE_BUCKET, supabase } from "@/lib/supabase";
import type { Owner, Vision } from "@/lib/types";

export async function listVisions(): Promise<Vision[]> {
  const { data, error } = await supabase()
    .from("visions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load visions: ${error.message}`);
  return (data ?? []) as Vision[];
}

type NewVision = {
  owner: Owner;
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
  const path = `${input.owner}/${crypto.randomUUID()}.${input.extension}`;

  const upload = await db.storage
    .from(STORAGE_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.contentType,
      cacheControl: "31536000",
      upsert: false,
    });
  if (upload.error) {
    throw new Error(`Upload failed: ${upload.error.message}`);
  }

  const {
    data: { publicUrl },
  } = db.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const { data, error } = await db
    .from("visions")
    .insert({
      owner: input.owner,
      title: input.title,
      image_path: path,
      image_url: publicUrl,
      width: input.width,
      height: input.height,
      tags: input.tags,
    })
    .select("*")
    .single();

  if (error || !data) {
    // Never leave an orphaned object behind a failed insert.
    await db.storage.from(STORAGE_BUCKET).remove([path]);
    throw new Error(`Could not save vision: ${error?.message ?? "no row returned"}`);
  }

  return data as Vision;
}

/** Returns false when no row matched, so the caller can answer 404. */
export async function deleteVision(id: string): Promise<boolean> {
  const db = supabase();

  const { data: existing, error: lookupError } = await db
    .from("visions")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) throw new Error(`Could not find vision: ${lookupError.message}`);
  if (!existing) return false;

  const { error } = await db.from("visions").delete().eq("id", id);
  if (error) throw new Error(`Could not delete vision: ${error.message}`);

  // The row is the source of truth; a failed object removal is not worth failing
  // the request over, it just leaves a stray file.
  await db.storage.from(STORAGE_BUCKET).remove([existing.image_path as string]);
  return true;
}
