"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { Placement } from "@/lib/layout";
import type { Vision } from "@/lib/types";
import { BLUR_DATA_URL, cardImageUrl } from "@/lib/image-url";
import { CardScrim } from "@/components/CardScrim";

type Props = {
  vision: Vision;
  placement: Placement;
  index: number;
  /** Newly added visions land with their own animation. */
  arriving: boolean;
  /** Editing controls are omitted entirely for anyone but the owner. */
  canEdit: boolean;
  onOpen: (vision: Vision) => void;
  onEdit: (vision: Vision) => void;
};

export function VisionCard({
  vision,
  placement,
  index,
  arriving,
  canEdit,
  onOpen,
  onEdit,
}: Props) {
  // Keyed on the stored URL rather than seeded once: swapping a vision's photo
  // hands this component a new image_url, and a `useState` initialiser would
  // never run again, leaving the old picture on screen until a reload.
  const [image, setImage] = useState(() => ({
    from: vision.image_url,
    src: cardImageUrl(vision.image_url),
    loaded: false,
  }));
  if (image.from !== vision.image_url) {
    setImage({
      from: vision.image_url,
      src: cardImageUrl(vision.image_url),
      loaded: false,
    });
  }

  // An image already in the browser cache can finish before React attaches
  // onLoad, in which case that event never fires and the card would sit at
  // zero opacity forever. The ref catches that case on mount, and keying the
  // element on its src makes the ref run again whenever the photo changes.
  const markLoaded = useCallback(
    () => setImage((current) => (current.loaded ? current : { ...current, loaded: true })),
    [],
  );

  return (
    <motion.div
      // Position changes (a new vision arriving, a resize) glide rather than
      // snap; the transform channel stays free for drift, entrance and hover.
      className="drift-host absolute transition-[left,top,width,height] duration-[900ms] ease-[var(--ease-soft)]"
      style={{
        left: placement.x,
        top: placement.y,
        width: placement.width,
        height: placement.height,
        zIndex: placement.z,
      }}
      initial={
        arriving
          ? { opacity: 0, scale: 0.72, y: -28, filter: "blur(10px)" }
          : { opacity: 0, scale: 0.94, y: 12 }
      }
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      transition={
        arriving
          ? { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
          : {
              duration: 0.75,
              ease: [0.22, 1, 0.36, 1],
              delay: Math.min(index * 0.045, 0.6),
            }
      }
    >
      <div
        className="drift h-full w-full"
        style={
          {
            "--drift-x": `${placement.driftX}px`,
            "--drift-y": `${placement.driftY}px`,
            "--drift-r": `${placement.driftRotate}deg`,
            "--drift-duration": `${placement.driftDuration}s`,
            "--drift-delay": `${placement.driftDelay}s`,
          } as React.CSSProperties
        }
      >
        <div
          className="group/card relative h-full w-full"
          style={{ transform: `rotate(${placement.rotate}deg)` }}
        >
          <button
            type="button"
            onClick={() => onOpen(vision)}
            aria-label={`Open ${vision.title}`}
            className="group absolute inset-0 block cursor-pointer overflow-hidden rounded-[var(--radius-glass)] border border-white/10 bg-white/5 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.95)] transition-[transform,box-shadow] duration-500 ease-[var(--ease-soft)] hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_40px_90px_-30px_rgba(0,0,0,1)] focus-visible:-translate-y-1.5"
          >
            <Image
              key={image.src}
              ref={(node) => {
                if (node?.complete && node.naturalWidth > 0) markLoaded();
              }}
              src={image.src}
              alt={vision.title}
              fill
              sizes="(max-width: 767px) 84vw, (max-width: 1279px) 34vw, 26vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              loading={index < 4 ? "eager" : "lazy"}
              onLoad={markLoaded}
              // If image transformations are unavailable on this project the
              // variant 400s; drop straight back to the untransformed original.
              onError={() =>
                setImage((current) =>
                  current.src === vision.image_url
                    ? current
                    : { ...current, src: vision.image_url },
                )
              }
              className={`object-cover transition-opacity duration-700 ${
                image.loaded ? "opacity-100" : "opacity-0"
              }`}
            />

            <CardScrim />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-left sm:p-4">
              <h3 className="font-display text-lg leading-tight text-parchment drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-xl">
                {vision.title}
              </h3>

              {vision.tags.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {vision.tags.slice(0, 5).map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] tracking-wide text-parchment-dim opacity-70 backdrop-blur-sm transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </button>

          {/*
            A sibling of the card surface rather than a child: the card is
            itself a button, and a button inside a button is invalid markup that
            browsers resolve unpredictably. `card-affordance` keeps it hidden
            until hover or keyboard focus on a pointer device, and permanently
            visible on touch, where there is no hover to reveal it.
          */}
          {canEdit ? (
          <button
            type="button"
            onClick={() => onEdit(vision)}
            aria-label={`Edit ${vision.title}`}
            title="Edit"
            className="card-affordance absolute top-2 right-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/45 text-parchment-dim backdrop-blur-md transition-[opacity,color,background-color] duration-300 hover:bg-black/70 hover:text-ember-soft"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11.2 2.3a1.6 1.6 0 0 1 2.3 2.3l-7.2 7.2-3 .7.7-3 7.2-7.2Z" />
              <path d="M10.2 3.4 12.4 5.6" />
            </svg>
          </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
