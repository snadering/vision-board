"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { cardImageUrl } from "@/lib/image-url";
import type { AdminProfile } from "@/lib/profiles";

/**
 * Everyone who has an account, waiting or otherwise. Pending arrivals are
 * handled in their own section above this one; what is left here is the
 * membership itself — who they are, how much they have pinned up, and whether
 * they still have their key.
 */
export function MemberList({ members }: { members: AdminProfile[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Which account is being deleted, and what has been typed to confirm it.
  const [deleting, setDeleting] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  async function setStatus(member: AdminProfile, action: "approve" | "block") {
    if (busy) return;
    setBusy(member.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/profiles/${member.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Could not change that account.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(member: AdminProfile) {
    if (busy) return;
    setBusy(member.id);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/profiles/${member.id}?confirm=${encodeURIComponent(typed.trim())}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Could not delete that account.");
      } else {
        setDeleting(null);
        setTyped("");
        router.refresh();
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  if (members.length === 0) {
    return (
      <section>
        <h2 className="label-caps mb-3 text-parchment-faint">Members (0)</h2>
        <p className="text-sm text-parchment-faint">Nobody yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="label-caps mb-3 text-parchment-faint">
        Members ({members.length})
      </h2>

      {error ? (
        <p role="alert" className="mb-3 text-xs text-blush">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {members.map((member) => {
            const blocked = member.status === "blocked";

            return (
              <motion.li
                key={member.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: blocked ? 0.55 : 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass flex flex-wrap items-center gap-3 rounded-xl p-3"
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  {member.avatar_url ? (
                    <Image
                      src={cardImageUrl(member.avatar_url, 96)}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-sm text-parchment-faint">
                      {member.username.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-parchment">
                    <Link
                      href={`/u/${member.username}`}
                      className="truncate transition-colors hover:text-ember-soft"
                    >
                      {member.username}
                    </Link>

                    {member.is_admin ? (
                      <span className="rounded-full border border-ember/25 px-1.5 py-0.5 text-[9px] tracking-widest text-ember-soft uppercase">
                        admin
                      </span>
                    ) : null}

                    {blocked ? (
                      <span className="text-[11px] text-blush">blocked</span>
                    ) : null}
                  </p>

                  <p className="mt-0.5 truncate text-[11px] text-parchment-faint">
                    {member.email ?? "no email"} · {member.vision_count} vision
                    {member.vision_count === 1 ? "" : "s"} ·{" "}
                    {member.board_public ? "public board" : "private board"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {member.is_admin ? (
                    // An admin can be neither blocked nor deleted; the API
                    // refuses both, so there is nothing here to press.
                    <span className="text-[11px] text-parchment-faint">—</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy === member.id}
                        onClick={() => setStatus(member, blocked ? "approve" : "block")}
                        className={`cursor-pointer rounded-full border px-4 py-1.5 text-[11px] transition-colors disabled:opacity-50 ${
                          blocked
                            ? "border-white/12 text-parchment-dim hover:bg-white/8"
                            : "border-white/12 text-parchment-faint hover:border-blush/40 hover:text-blush"
                        }`}
                      >
                        {blocked ? "Let back in" : "Block"}
                      </button>

                      {/*
                        Deliberately quiet, and it only opens the confirmation
                        — nothing here deletes on a single click.
                      */}
                      <button
                        type="button"
                        aria-label={`Delete ${member.username}`}
                        onClick={() => {
                          setError(null);
                          setTyped("");
                          setDeleting(deleting === member.id ? null : member.id);
                        }}
                        className="cursor-pointer rounded-full px-2 py-1.5 text-[11px] text-parchment-faint/70 transition-colors hover:text-blush"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>

                <AnimatePresence initial={false}>
                  {deleting === member.id ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="w-full overflow-hidden"
                    >
                      <div className="mt-3 rounded-xl border border-blush/25 bg-blush/[0.06] p-4">
                        <p className="text-xs leading-relaxed text-parchment">
                          Deleting <strong>{member.username}</strong> removes their
                          account, their{" "}
                          {member.vision_count === 1
                            ? "1 vision"
                            : `${member.vision_count} visions`}{" "}
                          and every image behind them. This cannot be undone.
                        </p>

                        <p className="mt-3 mb-2 text-[11px] text-parchment-faint">
                          Type <span className="text-parchment">{member.username}</span>{" "}
                          to confirm.
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={typed}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) => setTyped(event.target.value)}
                            placeholder={member.username}
                            className="glass min-w-0 flex-1 rounded-full px-4 py-2 text-xs text-parchment placeholder:text-parchment-faint/50 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setDeleting(null);
                              setTyped("");
                            }}
                            className="cursor-pointer rounded-full border border-white/12 px-4 py-2 text-[11px] text-parchment-dim transition-colors hover:bg-white/8"
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            disabled={
                              busy === member.id ||
                              typed.trim().toLowerCase() !==
                                member.username.toLowerCase()
                            }
                            onClick={() => remove(member)}
                            className="cursor-pointer rounded-full border border-blush/40 bg-blush/15 px-4 py-2 text-[11px] text-blush transition-colors hover:bg-blush/25 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy === member.id ? "Deleting…" : "Delete permanently"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
