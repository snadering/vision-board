"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import type { Placement } from "@/lib/layout";
import type { Vision } from "@/lib/types";
import { BLUR_DATA_URL, cardImageUrl } from "@/lib/image-url";

type Props = {
  vision: Vision;
  placement: Placement;
  index: number;
  /** Newly added visions land with their own animation. */
  arriving: boolean;
  onOpen: (vision: Vision) => void;
};

export function VisionCard({ vision, placement, index, arriving, onOpen }: Props) {
  const [src, setSrc] = useState(() => cardImageUrl(vision.image_url));
  const [loaded, setLoaded] = useState(false);

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
          className="h-full w-full"
          style={{ transform: `rotate(${placement.rotate}deg)` }}
        >
          <button
            type="button"
            onClick={() => onOpen(vision)}
            aria-label={`Open ${vision.title}`}
            className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-[var(--radius-glass)] border border-white/10 bg-white/5 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.95)] transition-[transform,box-shadow] duration-500 ease-[var(--ease-soft)] hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_40px_90px_-30px_rgba(0,0,0,1)] focus-visible:-translate-y-1.5"
          >
            <Image
              src={src}
              alt={vision.title}
              fill
              sizes="(max-width: 767px) 84vw, (max-width: 1279px) 34vw, 26vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              loading={index < 4 ? "eager" : "lazy"}
              onLoad={() => setLoaded(true)}
              // If image transformations are unavailable on this project the
              // variant 400s; drop straight back to the untransformed original.
              onError={() => {
                if (src !== vision.image_url) setSrc(vision.image_url);
              }}
              className={`object-cover transition-opacity duration-700 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Scrim: keeps the title readable over a bright photo. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

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
        </div>
      </div>
    </motion.div>
  );
}
