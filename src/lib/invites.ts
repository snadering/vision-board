import "server-only";
import { supabase } from "@/lib/supabase";

/**
 * Invite links.
 *
 * A link stands in for the approval queue: whoever signs up through a live one
 * is let in immediately. The token is the whole secret, so it is long, random,
 * and the only part of the URL that matters.
 */

export type Invite = {
  id: string;
  token: string;
  label: string | null;
  created_at: string;
  uses: number;
  revoked: boolean;
};

const COLUMNS = "id, token, label, created_at, uses, revoked";

/** 22 characters of base64url — 128 bits, not worth guessing at. */
function mintToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createInvite(
  createdBy: string,
  label?: string,
): Promise<Invite> {
  const { data, error } = await supabase()
    .from("invites")
    .insert({
      token: mintToken(),
      label: label?.trim() || null,
      created_by: createdBy,
    })
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Could not create that invite: ${error?.message ?? "no row"}`);
  }
  return data as Invite;
}

export async function listInvites(): Promise<Invite[]> {
  const { data, error } = await supabase()
    .from("invites")
    .select(COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load invites: ${error.message}`);
  return (data ?? []) as Invite[];
}

/** The invite behind a token, but only if it is still good for use. */
export async function usableInvite(token: string): Promise<Invite | null> {
  if (!token || token.length > 64) return null;

  const { data, error } = await supabase()
    .from("invites")
    .select(COLUMNS)
    .eq("token", token)
    .eq("revoked", false)
    .maybeSingle();

  if (error) throw new Error(`Could not check that invite: ${error.message}`);
  return (data as Invite) ?? null;
}

export async function revokeInvite(id: string, revoked = true): Promise<Invite> {
  const { data, error } = await supabase()
    .from("invites")
    .update({ revoked })
    .eq("id", id)
    .select(COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Could not change that invite: ${error?.message ?? "no row"}`);
  }
  return data as Invite;
}

/**
 * Counts a use. Deliberately not a transaction: the number is for your
 * information, not a limit, so a lost increment costs nothing and must never
 * cost somebody their account.
 */
export async function countInviteUse(invite: Invite): Promise<void> {
  const { error } = await supabase()
    .from("invites")
    .update({ uses: invite.uses + 1 })
    .eq("id", invite.id);
  if (error) console.error(`Could not count invite use: ${error.message}`);
}
