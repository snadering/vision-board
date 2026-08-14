"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

/**
 * One header across the whole site. What it offers depends on who you are:
 * a visitor gets a way in, a pending account gets nothing but a way out, and an
 * approved one gets their board, their settings, and the queue if they run the
 * place.
 */
/**
 * The lit pill marks where you are, not where we would like you to go — so it
 * follows the route rather than sitting permanently on "My board".
 */
const navLink = (active: boolean) =>
  [
    "relative rounded-full px-4 py-2 text-sm whitespace-nowrap transition-all duration-300 active:scale-[0.98]",
    active
      ? "border border-ember/30 bg-ember/12 text-ember-soft shadow-[0_0_30px_-10px_color-mix(in_oklab,var(--color-ember)_60%,transparent)] hover:bg-ember/22"
      : "border border-transparent text-parchment-faint hover:bg-white/6 hover:text-parchment-dim",
  ].join(" ");

/**
 * Icon-only nav controls — the gear and the lock. Same footprint as each other,
 * and the same lit treatment as the text items when you are on that page.
 */
const iconLink = (active: boolean) =>
  [
    "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-300",
    active
      ? "border-ember/30 bg-ember/12 text-ember-soft shadow-[0_0_30px_-10px_color-mix(in_oklab,var(--color-ember)_60%,transparent)]"
      : "border-transparent text-parchment-faint hover:bg-white/6 hover:text-parchment-dim",
  ].join(" ");

export function SiteHeader({
  user,
  pendingCount = 0,
}: {
  user: Profile | null;
  pendingCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);

  async function onSignOut() {
    if (leaving) return;
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/");
    router.refresh();
  }

  const approved = user?.status === "approved";

  const here = decodeURIComponent(pathname ?? "").toLowerCase();
  // "My board" lights up only on your own board, not on somebody else's.
  const onMyBoard = approved && here === `/u/${user.username.toLowerCase()}`;
  const onQueue = here.startsWith("/admin");
  const onSettings = here.startsWith("/settings");

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-2 sm:px-8 sm:pt-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3">
        <Link
          href="/"
          className="font-display text-2xl leading-none text-parchment transition-opacity hover:opacity-80 sm:text-3xl"
        >
          Vision Board
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {approved ? (
            <>
              <Link
                href={`/u/${user.username}`}
                aria-current={onMyBoard ? "page" : undefined}
                className={navLink(onMyBoard)}
              >
                My board
              </Link>

              {user.is_admin ? (
                <Link
                  href="/admin"
                  aria-current={onQueue ? "page" : undefined}
                  className={navLink(onQueue)}
                >
                  Admin
                  {pendingCount > 0 ? (
                    <span className="ml-1.5 rounded-full bg-ember/25 px-1.5 py-0.5 text-[10px] text-ember-soft tabular-nums">
                      {pendingCount}
                    </span>
                  ) : null}
                </Link>
              ) : null}

              <Link
                href="/settings"
                aria-label="Settings"
                title="Settings"
                aria-current={onSettings ? "page" : undefined}
                className={iconLink(onSettings)}
              >
                {/* Stroke 1.8 in a 24 viewBox reads at the same weight as the
                    lock's 1.2 in a 16 one. */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
                </svg>
              </Link>
            </>
          ) : null}

          {user ? (
            <button
              type="button"
              onClick={onSignOut}
              disabled={leaving}
              aria-label="Sign out"
              title="Sign out"
              className={`${iconLink(false)} disabled:opacity-50`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <rect x="3" y="7" width="10" height="7" rx="2" />
                <path d="M5.5 7V5a2.5 2.5 0 1 1 5 0v2" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-ember/30 bg-ember/12 px-5 py-2 text-sm whitespace-nowrap text-ember-soft transition-all duration-300 hover:bg-ember/22 active:scale-[0.98]"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
