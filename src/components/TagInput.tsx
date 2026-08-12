"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MAX_TAGS, MAX_TAG_LENGTH } from "@/lib/types";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
};

export function TagInput({ tags, onChange, disabled }: Props) {
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function commit(raw: string) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) return;

    if (tags.length >= MAX_TAGS) {
      setNotice(`${MAX_TAGS} keywords is plenty.`);
      return;
    }
    if (tag.length > MAX_TAG_LENGTH) {
      setNotice(`Keep keywords under ${MAX_TAG_LENGTH} characters.`);
      return;
    }
    if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setNotice("That one's already there.");
      setDraft("");
      return;
    }

    setNotice(null);
    setDraft("");
    onChange([...tags, tag]);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && draft.length === 0 && tags.length > 0) {
      event.preventDefault();
      onChange(tags.slice(0, -1));
      setNotice(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          const value = event.target.value;
          // Typing a comma commits, so pasted lists split cleanly too.
          if (value.includes(",")) {
            value.split(",").forEach(commit);
            return;
          }
          setDraft(value);
          if (notice) setNotice(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder="Freedom, salt air, slow mornings…"
        aria-label="Affirmation keywords"
        aria-describedby="tag-hint"
        className="glass w-full rounded-xl px-4 py-3 text-sm text-parchment placeholder:text-parchment-faint/60 transition-shadow duration-300 focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_28%,transparent)] focus:outline-none disabled:opacity-50"
      />

      <p id="tag-hint" className="mt-2 text-[11px] text-parchment-faint">
        {notice ?? "Press Enter to lock a keyword in."}
      </p>

      {tags.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {tags.map((tag) => (
              <motion.li
                key={tag}
                layout
                initial={{ opacity: 0, scale: 0.8, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 py-1 pr-1.5 pl-3 text-xs text-parchment-dim"
              >
                {tag}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(tags.filter((item) => item !== tag))}
                  aria-label={`Remove ${tag}`}
                  className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-parchment-faint transition-colors hover:bg-white/12 hover:text-blush"
                >
                  ×
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}
    </div>
  );
}
