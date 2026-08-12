"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { BLUR_DATA_URL } from "@/lib/image-url";
import { useDialog } from "@/lib/use-dialog";
import { OWNER_LABELS, type Vision } from "@/lib/types";

type Props = {
  vision: Vision | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
};

export function Lightbox({ vision, onClose, onDeleted }: Props) {
  const open = vision !== null;
  const ref = useDialog(open, onClose);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when the lightbox closes, or when it swings straight to another
  // vision: nobody should meet a half-armed delete button.
  const [shownId, setShownId] = useState<string | null>(vision?.id ?? null);
  if (shownId !== (vision?.id ?? null)) {
    setShownId(vision?.id ?? null);
    setConfirming(false);
    setDeleting(false);
    setError(null);
  }

  async function onDelete() {
    if (!vision || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/visions/${vision.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "Could not delete that vision.");
        setDeleting(false);
        return;
      }
      onDeleted(vision.id);
    } catch {
      setError("Could not reach the server.");
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      {vision ? (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(14px)" }}
            exit={{ backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.35 }}
            onClick={onClose}
          />

          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={vision.title}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-glass)] shadow-[0_50px_120px_-40px_rgba(0,0,0,1)]"
          >
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/30">
              <Image
                src={vision.image_url}
                alt={vision.title}
                width={vision.width}
                height={vision.height}
                sizes="(max-width: 767px) 92vw, 80vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="max-h-[64vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div className="min-w-0">
                <p className="label-caps text-parchment-faint">
                  {OWNER_LABELS[vision.owner]}
                </p>
                <h2 className="mt-1.5 font-display text-3xl leading-tight text-parchment sm:text-4xl">
                  {vision.title}
                </h2>
                {vision.tags.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {vision.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-xs text-parchment-dim"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {error ? (
                  <p role="alert" className="mr-2 text-xs text-blush">
                    {error}
                  </p>
                ) : null}

                {confirming ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      disabled={deleting}
                      className="cursor-pointer rounded-full border border-white/12 px-4 py-2 text-sm text-parchment-dim transition-colors hover:bg-white/8 disabled:opacity-50"
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={deleting}
                      className="cursor-pointer rounded-full border border-blush/40 bg-blush/15 px-4 py-2 text-sm text-blush transition-colors hover:bg-blush/25 disabled:opacity-50"
                    >
                      {deleting ? "Removing…" : "Yes, remove it"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="cursor-pointer rounded-full border border-white/12 px-4 py-2 text-sm text-parchment-faint transition-colors hover:border-blush/40 hover:text-blush"
                  >
                    Remove
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-full border border-white/12 px-4 py-2 text-sm text-parchment-dim transition-colors hover:bg-white/8"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
