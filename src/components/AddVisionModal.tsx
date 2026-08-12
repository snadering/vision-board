"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { TagInput } from "@/components/TagInput";
import { OwnerSelect } from "@/components/OwnerSelect";
import { useDialog } from "@/lib/use-dialog";
import type { PreparedImage } from "@/lib/prepare-image";
import { MAX_TITLE_LENGTH, type Owner, type Vision } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (vision: Vision) => void;
};

export function AddVisionModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ref = useDialog(open && !submitting, onClose);

  // Only clear the form once the modal has fully closed, so a failed submit
  // keeps everything the user typed.
  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      setTitle("");
      setImage(null);
      setTags([]);
      setOwner(null);
      setError(null);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [open]);

  const ready = title.trim().length > 0 && image !== null && owner !== null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || submitting || !image || !owner) return;

    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("title", title.trim());
    body.set("owner", owner);
    body.set("tags", JSON.stringify(tags));
    body.set("width", String(image.width));
    body.set("height", String(image.height));
    body.set("file", image.file);

    try {
      const response = await fetch("/api/visions", { method: "POST", body });
      const payload = (await response.json().catch(() => null)) as
        | { vision?: Vision; error?: string }
        | null;

      if (!response.ok || !payload?.vision) {
        setError(payload?.error ?? "Could not save that vision.");
        setSubmitting(false);
        return;
      }

      onCreated(payload.vision);
      setSubmitting(false);
    } catch {
      setError("Could not reach the server. Your vision is still here.");
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="add-vision"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-10 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/65"
            initial={{ backdropFilter: "blur(0px)" }}
            animate={{ backdropFilter: "blur(14px)" }}
            exit={{ backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.35 }}
            onClick={() => {
              if (!submitting) onClose();
            }}
          />

          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-vision-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass relative w-full max-w-md overflow-hidden rounded-[var(--radius-glass)] p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,1)] sm:p-7"
          >
            <h2
              id="add-vision-title"
              className="font-display text-3xl leading-none text-parchment"
            >
              Add a vision
            </h2>
            <p className="mt-2 text-xs text-parchment-faint">
              Give it a name, a picture, and a few words to hold it to.
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
              <div>
                <label
                  htmlFor="vision-title"
                  className="label-caps mb-2 block text-parchment-faint"
                >
                  Title
                </label>
                <input
                  id="vision-title"
                  type="text"
                  value={title}
                  maxLength={MAX_TITLE_LENGTH}
                  disabled={submitting}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="A house by the water"
                  className="glass w-full rounded-xl px-4 py-3 text-sm text-parchment placeholder:text-parchment-faint/60 transition-shadow duration-300 focus:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-ember)_28%,transparent)] focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <span className="label-caps mb-2 block text-parchment-faint">
                  Image
                </span>
                <ImageDropzone
                  image={image}
                  onChange={setImage}
                  disabled={submitting}
                />
              </div>

              <div>
                <span className="label-caps mb-2 block text-parchment-faint">
                  Affirmation keywords
                </span>
                <TagInput tags={tags} onChange={setTags} disabled={submitting} />
              </div>

              <div>
                <span className="label-caps mb-2 block text-parchment-faint">
                  Whose vision is this?
                </span>
                <OwnerSelect
                  value={owner}
                  onChange={setOwner}
                  disabled={submitting}
                />
              </div>

              {error ? (
                <p role="alert" className="text-xs text-blush">
                  {error}
                </p>
              ) : null}

              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="cursor-pointer rounded-full px-4 py-2.5 text-sm text-parchment-faint transition-colors hover:text-parchment disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!ready || submitting}
                  className="relative cursor-pointer overflow-hidden rounded-full border border-ember/35 bg-ember/15 px-6 py-2.5 text-sm text-ember-soft transition-all duration-300 hover:bg-ember/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? (
                    <span className="shimmer absolute inset-0" aria-hidden />
                  ) : null}
                  <span className="relative">
                    {submitting ? "Pinning it up…" : "Add to the board"}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
