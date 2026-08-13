"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { TagInput } from "@/components/TagInput";
import { useDialog } from "@/lib/use-dialog";
import type { PreparedImage } from "@/lib/prepare-image";
import { randomGradient, renderGradient, type GradientSpec } from "@/lib/gradient";
import { MAX_TITLE_LENGTH, type Vision } from "@/lib/types";

type Props = {
  open: boolean;
  /** null adds a new vision; a vision edits that one. */
  vision: Vision | null;
  onClose: () => void;
  onSaved: (vision: Vision, mode: "created" | "updated") => void;
};

export function VisionModal({ open, vision, onClose, onSaved }: Props) {
  const editing = vision !== null;

  const [title, setTitle] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only used when creating without a photograph.
  const [gradient, setGradient] = useState<GradientSpec>(() => randomGradient());

  const ref = useDialog(open && !submitting, onClose);

  // Load the form the moment it opens, and again if it is pointed at a
  // different vision. Doing it during render rather than in an effect means the
  // fields are never painted empty for a frame first.
  const formKey = open ? (vision?.id ?? "new") : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (formKey !== null && loadedKey !== formKey) {
    setLoadedKey(formKey);
    setTitle(vision?.title ?? "");
    setTags(vision?.tags ?? []);
    setImage(null);
    setError(null);
    setGradient(randomGradient());
  }

  // Only clear once the modal has finished closing, so a failed submit keeps
  // everything the user typed.
  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => {
      setLoadedKey(null);
      setTitle("");
      setImage(null);
      setTags([]);
      setError(null);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [open]);

  // A picture is optional now: without one, a gradient is painted on submit.
  const complete = title.trim().length > 0;
  const changed =
    !editing ||
    image !== null ||
    title.trim() !== vision.title ||
    tags.join(" ") !== vision.tags.join(" ");
  const ready = complete && changed;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || submitting) return;

    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("title", title.trim());
    body.set("tags", JSON.stringify(tags));

    try {
      if (image) {
        body.set("width", String(image.width));
        body.set("height", String(image.height));
        body.set("file", image.file);
      } else if (!editing) {
        // Nothing chosen, and this is a new vision: paint the stand-in that has
        // been on show in the form.
        body.set("width", String(gradient.width));
        body.set("height", String(gradient.height));
        body.set("file", await renderGradient(gradient));
      }
      // On an edit with no replacement chosen, no file is sent at all and the
      // stored photo is kept.

      const response = await fetch(
        editing ? `/api/visions/${vision.id}` : "/api/visions",
        { method: editing ? "PATCH" : "POST", body },
      );
      const payload = (await response.json().catch(() => null)) as
        | { vision?: Vision; error?: string }
        | null;

      if (!response.ok || !payload?.vision) {
        setError(payload?.error ?? "Could not save that vision.");
        setSubmitting(false);
        return;
      }

      onSaved(payload.vision, editing ? "updated" : "created");
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
          key="vision-modal"
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
            aria-labelledby="vision-modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass relative w-full max-w-md overflow-hidden rounded-[var(--radius-glass)] p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,1)] sm:p-7"
          >
            <h2
              id="vision-modal-title"
              className="font-display text-3xl leading-none text-parchment"
            >
              {editing ? "Edit this vision" : "Add a vision"}
            </h2>
            <p className="mt-2 text-xs text-parchment-faint">
              {editing
                ? "Change anything — the words or the picture."
                : "Give it a name, a picture, and a few words to hold it to."}
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
                  existing={
                    vision
                      ? {
                          url: vision.image_url,
                          width: vision.width,
                          height: vision.height,
                        }
                      : null
                  }
                  fallback={
                    editing
                      ? null
                      : {
                          spec: gradient,
                          onShuffle: () => setGradient(randomGradient()),
                        }
                  }
                />
              </div>

              <div>
                <span className="label-caps mb-2 block text-parchment-faint">
                  Affirmation keywords
                </span>
                <TagInput tags={tags} onChange={setTags} disabled={submitting} />
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
                    {submitting
                      ? editing
                        ? "Saving…"
                        : "Pinning it up…"
                      : editing
                        ? "Save changes"
                        : "Add to the board"}
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
