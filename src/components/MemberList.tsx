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

                <div className="shrink-0">
                  {member.is_admin ? (
                    // An admin cannot be blocked; the API refuses it too, so
                    // there is nothing here to press by accident.
                    <span className="text-[11px] text-parchment-faint">—</span>
                  ) : (
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
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
