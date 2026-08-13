"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ImageError, prepareImage, type PreparedImage } from "@/lib/prepare-image";
import { gradientCss, type GradientSpec } from "@/lib/gradient";
import { ACCEPTED_INPUT_MIME } from "@/lib/types";

type Props = {
  image: PreparedImage | null;
  onChange: (image: PreparedImage | null) => void;
  disabled?: boolean;
  /** The photo already on the record, shown until a replacement is chosen. */
  existing?: { url: string; width: number; height: number } | null;
  /**
   * What will be painted if no picture is chosen. Shown so the fallback is a
   * visible choice rather than a surprise after saving.
   */
  fallback?: { spec: GradientSpec; onShuffle: () => void } | null;
};

export function ImageDropzone({
  image,
  onChange,
  disabled,
  existing,
  fallback,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [optimising, setOptimising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shown the instant a file is picked, before optimising finishes.
  const [instantPreview, setInstantPreview] = useState<string | null>(null);

  async function accept(file: File | undefined) {
    if (!file || disabled) return;

    setError(null);
    const preview = URL.createObjectURL(file);
    setInstantPreview(preview);
    setOptimising(true);

    try {
      const prepared = await prepareImage(file);
      onChange(prepared);
    } catch (thrown) {
      onChange(null);
      setError(
        thrown instanceof ImageError
          ? thrown.message
          : "Something went wrong reading that image.",
      );
    } finally {
      setOptimising(false);
      URL.revokeObjectURL(preview);
      setInstantPreview(null);
    }
  }

  const preview = image?.previewUrl ?? instantPreview ?? existing?.url ?? null;
  const showingExisting = !image && !instantPreview && Boolean(existing);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_INPUT_MIME.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          void accept(event.target.files?.[0]);
          // Reset so picking the same file twice still fires.
          event.target.value = "";
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void accept(event.dataTransfer.files?.[0]);
        }}
        className={`relative overflow-hidden rounded-xl border border-dashed transition-colors duration-300 ${
          dragging
            ? "border-ember/60 bg-ember/10"
            : "border-white/15 bg-white/[0.03] hover:border-white/25"
        }`}
      >
        {preview ? (
          <div className="flex items-center gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URL, nothing for the optimiser to do */}
            <img
              src={preview}
              alt="Selected vision"
              className="h-24 w-24 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              {optimising ? (
                <p className="text-sm text-parchment-dim">Optimising…</p>
              ) : image ? (
                <>
                  <p className="text-sm text-parchment">
                    {image.width} × {image.height}
                  </p>
                  <p className="mt-0.5 text-[11px] text-parchment-faint">
                    {(image.originalBytes / (1024 * 1024)).toFixed(1)} MB →{" "}
                    {(image.file.size / 1024).toFixed(0)} KB
                  </p>
                </>
              ) : showingExisting && existing ? (
                <>
                  <p className="text-sm text-parchment">
                    {existing.width} × {existing.height}
                  </p>
                  <p className="mt-0.5 text-[11px] text-parchment-faint">
                    The photo already on this vision
                  </p>
                </>
              ) : null}

              <button
                type="button"
                disabled={disabled || optimising}
                onClick={() => inputRef.current?.click()}
                className="mt-2 cursor-pointer rounded-full border border-white/15 px-3 py-1 text-xs text-parchment-dim transition-colors hover:bg-white/8 disabled:opacity-50"
              >
                Swap image
              </button>
            </div>
          </div>
        ) : fallback ? (
          <div className="flex items-center gap-4 p-3">
            <div
              aria-hidden
              className="h-24 w-24 shrink-0 rounded-lg"
              style={{ backgroundImage: gradientCss(fallback.spec) }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-parchment">No picture? We&rsquo;ll paint one.</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-parchment-faint">
                You can swap it for a photo whenever you like.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-xs text-parchment-dim transition-colors hover:bg-white/8 disabled:opacity-50"
                >
                  Choose a photo
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={fallback.onShuffle}
                  className="cursor-pointer rounded-full border border-white/15 px-3 py-1 text-xs text-parchment-dim transition-colors hover:bg-white/8 disabled:opacity-50"
                >
                  Another colour
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center gap-1.5 px-4 py-8 text-center disabled:cursor-not-allowed"
          >
            <span className="text-sm text-parchment-dim">
              Drop an image, or <span className="text-ember-soft">browse</span>
            </span>
            <span className="text-[11px] text-parchment-faint">
              JPEG, PNG, WebP or HEIC · any size, we&rsquo;ll handle it
            </span>
          </button>
        )}

        {optimising ? (
          <div className="shimmer pointer-events-none absolute inset-0" />
        ) : null}
      </div>

      <AnimatePresence>
        {error ? (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-[11px] text-blush"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
