"use client";

import { motion } from "motion/react";
import { OWNER_LABELS, type Owner } from "@/lib/types";

export function EmptyState({ owner, onAdd }: { owner: Owner; onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[52vh] flex-col items-center justify-center px-6 text-center"
    >
      {/* A frame with nothing in it yet. */}
      <svg
        aria-hidden
        width="112"
        height="112"
        viewBox="0 0 112 112"
        fill="none"
        className="mb-8 opacity-60"
      >
        <rect
          x="18.5"
          y="14.5"
          width="75"
          height="83"
          rx="10"
          stroke="url(#empty-frame)"
          strokeWidth="1"
          strokeDasharray="5 7"
        />
        <circle cx="56" cy="50" r="13" stroke="url(#empty-frame)" strokeWidth="1" />
        <path
          d="M40 78c6-11 12-16 16-16s10 5 16 16"
          stroke="url(#empty-frame)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="empty-frame" x1="18" y1="14" x2="94" y2="98">
            <stop stopColor="var(--color-ember)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--color-blush)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
      </svg>

      <h2 className="font-display text-3xl text-parchment sm:text-4xl">
        {OWNER_LABELS[owner]}&rsquo;s board is still quiet
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-parchment-faint">
        Every board starts with one dream pinned somewhere in the dark. Add the
        first and the rest will find their way around it.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-8 cursor-pointer rounded-full border border-ember/30 bg-ember/10 px-6 py-2.5 text-sm text-ember-soft transition-all duration-300 hover:bg-ember/20 active:scale-[0.98]"
      >
        Add the first vision
      </button>
    </motion.div>
  );
}
