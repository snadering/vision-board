"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Profile } from "@/lib/types";

type Props = {
  pending: Profile[];
  blocked: Profile[];
  /** Accounts from before sign-in existed, still waiting for their owner. */
  unclaimed: Profile[];
};

export function ApprovalQueue({ pending, blocked, unclaimed }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});

  // Re-runs this route's server render and swaps in the result, so the queue
  // updates without the page reloading. `useTransition` is what makes the
  // button able to say it is working: router.refresh() itself returns nothing
  // to wait on.
  const [checking, startChecking] = useTransition();
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  function check() {
    setCheckedAt(
      new Date().toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    startChecking(() => router.refresh());
  }

  async function act(id: string, action: string, mergeInto?: string) {
    if (busy) return;
    setBusy(id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/profiles/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, mergeInto }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Could not do that.");
        setBusy(null);
        return;
      }

      router.refresh();
      setBusy(null);
    } catch {
      setError("Could not reach the server.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {error ? (
        <p role="alert" className="text-xs text-blush">
          {error}
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="label-caps text-parchment-faint">
            Waiting ({pending.length})
          </h2>

          <div className="flex items-center gap-3">
            {checkedAt ? (
              <span className="text-[11px] text-parchment-faint tabular-nums">
                checked {checkedAt}
              </span>
            ) : null}
            <button
              type="button"
              onClick={check}
              disabled={checking}
              className="cursor-pointer rounded-full border border-white/12 px-4 py-1.5 text-xs text-parchment-dim transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checking ? "Checking…" : "Check for new"}
            </button>
          </div>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-parchment-faint">Nobody is waiting.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {pending.map((person) => (
                <motion.li
                  key={person.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="glass rounded-xl p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-parchment">
                        {person.username}
                      </p>
                      <p className="truncate text-[11px] text-parchment-faint">
                        {person.email}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={busy === person.id}
                        onClick={() => act(person.id, "block")}
                        className="cursor-pointer rounded-full border border-white/12 px-4 py-2 text-xs text-parchment-faint transition-colors hover:border-blush/40 hover:text-blush disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={busy === person.id}
                        onClick={() => act(person.id, "approve")}
                        className="cursor-pointer rounded-full border border-ember/35 bg-ember/15 px-4 py-2 text-xs text-ember-soft transition-colors hover:bg-ember/25 disabled:opacity-50"
                      >
                        Let them in
                      </button>
                    </div>
                  </div>

                  {unclaimed.length > 0 ? (
                    <div className="mt-3 border-t border-white/8 pt-3">
                      <p className="mb-2 text-[11px] text-parchment-faint">
                        Or hand them a board that already exists — the visions on
                        it come with it.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={mergeTarget[person.id] ?? ""}
                          onChange={(event) =>
                            setMergeTarget((current) => ({
                              ...current,
                              [person.id]: event.target.value,
                            }))
                          }
                          className="glass rounded-full px-3 py-1.5 text-xs text-parchment outline-none"
                        >
                          <option value="">Choose an account…</option>
                          {unclaimed.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.username}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy === person.id || !mergeTarget[person.id]}
                          onClick={() =>
                            act(person.id, "merge", mergeTarget[person.id])
                          }
                          className="cursor-pointer rounded-full border border-white/12 px-4 py-1.5 text-xs text-parchment-dim transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Link them
                        </button>
                      </div>
                    </div>
                  ) : null}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      {unclaimed.length > 0 ? (
        <section>
          <h2 className="label-caps mb-3 text-parchment-faint">
            Unclaimed boards ({unclaimed.length})
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-parchment-faint">
            Boards that existed before sign-ins did. They stay here until you
            link them to whoever signs up.
          </p>
          <ul className="flex flex-wrap gap-2">
            {unclaimed.map((profile) => (
              <li
                key={profile.id}
                className="glass rounded-full px-4 py-2 text-xs text-parchment-dim"
              >
                {profile.username}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {blocked.length > 0 ? (
        <section>
          <h2 className="label-caps mb-3 text-parchment-faint">
            Declined ({blocked.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {blocked.map((person) => (
              <li
                key={person.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 px-4 py-3"
              >
                <span className="truncate text-xs text-parchment-faint">
                  {person.username} · {person.email}
                </span>
                <button
                  type="button"
                  disabled={busy === person.id}
                  onClick={() => act(person.id, "approve")}
                  className="shrink-0 cursor-pointer rounded-full border border-white/12 px-4 py-1.5 text-xs text-parchment-dim transition-colors hover:bg-white/8 disabled:opacity-50"
                >
                  Let them in after all
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
