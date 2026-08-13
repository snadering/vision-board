"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Invite } from "@/lib/invites";

/**
 * Invite links, from the point of view of the person handing them out: make
 * one, copy it, close it when it has travelled far enough.
 */
export function InviteLinks({ invites }: { invites: Invite[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [, startRefresh] = useTransition();

  const linkFor = (invite: Invite) =>
    typeof window === "undefined"
      ? `/join/${invite.token}`
      : `${window.location.origin}/join/${invite.token}`;

  async function create() {
    if (busy) return;
    setBusy("new");
    setError(null);

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not make a link.");
      } else {
        setLabel("");
        startRefresh(() => router.refresh());
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function setRevoked(invite: Invite, revoked: boolean) {
    if (busy) return;
    setBusy(invite.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/invites/${invite.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revoked }),
      });
      if (!response.ok) {
        setError("Could not change that link.");
      } else {
        startRefresh(() => router.refresh());
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(null);
    }
  }

  async function copy(invite: Invite) {
    try {
      await navigator.clipboard.writeText(linkFor(invite));
      setCopied(invite.id);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Copying failed — select the link and copy it by hand.");
    }
  }

  const live = invites.filter((invite) => !invite.revoked);
  const closed = invites.filter((invite) => invite.revoked);

  return (
    <section>
      <h2 className="label-caps mb-3 text-parchment-faint">Invite links</h2>
      <p className="mb-4 text-xs leading-relaxed text-parchment-faint">
        Anyone who signs up through a live link is let straight in, without
        waiting here. Close a link once it has been passed around far enough.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={label}
          maxLength={60}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="What's this link for? (optional)"
          className="glass min-w-0 flex-1 rounded-full px-4 py-2 text-xs text-parchment placeholder:text-parchment-faint/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={create}
          disabled={busy === "new"}
          className="cursor-pointer rounded-full border border-ember/35 bg-ember/15 px-5 py-2 text-xs whitespace-nowrap text-ember-soft transition-colors hover:bg-ember/25 disabled:opacity-50"
        >
          {busy === "new" ? "Making…" : "Make a link"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mb-3 text-xs text-blush">
          {error}
        </p>
      ) : null}

      {live.length === 0 && closed.length === 0 ? (
        <p className="text-sm text-parchment-faint">No links yet.</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {[...live, ...closed].map((invite) => (
            <motion.li
              key={invite.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: invite.revoked ? 0.5 : 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass rounded-xl p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-parchment">
                    {invite.label || "Invite link"}
                    {invite.revoked ? (
                      <span className="ml-2 text-parchment-faint">· closed</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-parchment-faint">
                    /join/{invite.token}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] text-parchment-faint tabular-nums">
                    {invite.uses} used
                  </span>

                  {!invite.revoked ? (
                    <button
                      type="button"
                      onClick={() => copy(invite)}
                      className="cursor-pointer rounded-full border border-white/12 px-3 py-1.5 text-[11px] text-parchment-dim transition-colors hover:bg-white/8"
                    >
                      {copied === invite.id ? "Copied" : "Copy link"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={busy === invite.id}
                    onClick={() => setRevoked(invite, !invite.revoked)}
                    className="cursor-pointer rounded-full border border-white/12 px-3 py-1.5 text-[11px] text-parchment-faint transition-colors hover:border-blush/40 hover:text-blush disabled:opacity-50"
                  >
                    {invite.revoked ? "Reopen" : "Close"}
                  </button>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
