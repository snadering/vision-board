"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { OWNERS, OWNER_LABELS, type Owner } from "@/lib/types";

type Props = {
  owner: Owner;
  onOwnerChange: (owner: Owner) => void;
  onAdd: () => void;
  counts: Record<Owner, number>;
};

export function Nav({ owner, onOwnerChange, onAdd, counts }: Props) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function onLogout() {
    if (leaving) return;
    setLeaving(true);
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-2 sm:px-8 sm:pt-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl leading-none text-parchment sm:text-3xl">
          Vision Board
        </h1>

        <nav
          aria-label="Whose board"
          className="glass order-3 flex w-full gap-1 rounded-full p-1 sm:order-none sm:ml-6 sm:w-auto"
        >
          {OWNERS.map((person) => {
            const active = person === owner;
            return (
              <button
                key={person}
                type="button"
                onClick={() => onOwnerChange(person)}
                aria-current={active ? "page" : undefined}
                className={`relative flex-1 cursor-pointer rounded-full px-5 py-2 text-sm whitespace-nowrap transition-colors duration-300 sm:flex-none ${
                  active ? "text-ink-900" : "text-parchment-dim hover:text-parchment"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-tab-indicator"
                    transition={{ type: "spring", stiffness: 360, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-ember-soft to-blush"
                  />
                ) : null}
                <span className="relative z-10">
                  {OWNER_LABELS[person]}
                  <span
                    className={`ml-2 text-[11px] tabular-nums ${
                      active ? "text-ink-900/60" : "text-parchment-faint"
                    }`}
                  >
                    {counts[person]}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="cursor-pointer rounded-full border border-ember/30 bg-ember/12 px-5 py-2 text-sm whitespace-nowrap text-ember-soft shadow-[0_0_30px_-10px_color-mix(in_oklab,var(--color-ember)_60%,transparent)] transition-all duration-300 hover:bg-ember/22 hover:shadow-[0_0_40px_-8px_color-mix(in_oklab,var(--color-ember)_70%,transparent)] active:scale-[0.98]"
          >
            Add Vision
          </button>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Lock the board"
            title="Lock the board"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-parchment-faint transition-colors duration-300 hover:bg-white/6 hover:text-parchment-dim disabled:opacity-50"
            disabled={leaving}
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
        </div>
      </div>
    </header>
  );
}
