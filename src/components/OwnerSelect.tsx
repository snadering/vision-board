"use client";

import { motion } from "motion/react";
import { OWNERS, OWNER_LABELS, type Owner } from "@/lib/types";

type Props = {
  value: Owner | null;
  onChange: (owner: Owner) => void;
  disabled?: boolean;
  /** Distinguishes the sliding highlight from the navbar's. */
  layoutId?: string;
};

export function OwnerSelect({
  value,
  onChange,
  disabled,
  layoutId = "owner-select-highlight",
}: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Whose vision is this?"
      className="glass flex gap-1 rounded-full p-1"
    >
      {OWNERS.map((owner) => {
        const selected = value === owner;
        return (
          <button
            key={owner}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(owner)}
            className={`relative flex-1 cursor-pointer rounded-full px-4 py-2.5 text-sm transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
              selected ? "text-ink-900" : "text-parchment-dim hover:text-parchment"
            }`}
          >
            {selected ? (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-ember-soft to-blush"
              />
            ) : null}
            <span className="relative z-10">{OWNER_LABELS[owner]}</span>
          </button>
        );
      })}
    </div>
  );
}
