"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import type { Placement } from "@/lib/layout";
import type { DirectoryEntry } from "@/lib/types";
import { BLUR_DATA_URL, cardImageUrl } from "@/lib/image-url";

type Props = {
  person: DirectoryEntry;
  placement: Placement;
  index: number;
  /** The signed-in person's own card is marked, so they can find themselves. */
  isYou: boolean;
};

export function PersonCard({ person, placement, index, isYou }: Props) {
  const [src, setSrc] = useState(() =>
    person.avatar_url ? cardImageUrl(person.avatar_url, 600) : null,
  );
  const [loaded, setLoaded] = useState(false);

  return (
    <motion.div
      className="drift-host absolute transition-[left,top,width,height] duration-[900ms] ease-[var(--ease-soft)]"
      style={{
        left: placement.x,
        top: placement.y,
        width: placement.width,
        height: placement.height,
        zIndex: placement.z,
      }}
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
        delay: Math.min(index * 0.05, 0.6),
      }}
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
          <Link
            href={`/u/${person.username}`}
            aria-label={`${person.username}'s board`}
            className="group relative block h-full w-full overflow-hidden rounded-[var(--radius-glass)] border border-white/10 bg-white/5 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.95)] transition-[transform,box-shadow] duration-500 ease-[var(--ease-soft)] hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_40px_90px_-30px_rgba(0,0,0,1)] focus-visible:-translate-y-1.5"
          >
            {src ? (
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 767px) 84vw, 26vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                loading={index < 4 ? "eager" : "lazy"}
                onLoad={() => setLoaded(true)}
                onError={() => {
                  if (person.avatar_url && src !== person.avatar_url) {
                    setSrc(person.avatar_url);
                  }
                }}
                className={`object-cover transition-opacity duration-700 ${
                  loaded ? "opacity-100" : "opacity-0"
                }`}
              />
            ) : (
              // No picture: the initial, set in the display serif.
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-plum/60 to-ink-800">
                <span className="font-display text-5xl text-parchment/70">
                  {person.username.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-left sm:p-4">
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg leading-tight text-parchment drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] sm:text-xl">
                  {person.username}
                  {isYou ? (
                    <span className="ml-2 align-middle text-[10px] tracking-widest text-ember-soft/80 uppercase">
                      you
                    </span>
                  ) : null}
                </h3>
                <p className="mt-1 text-[11px] text-parchment-faint">
                  {person.vision_count === 0
                    ? "no visions yet"
                    : `${person.vision_count} vision${person.vision_count === 1 ? "" : "s"}`}
                </p>
              </div>

              {!person.board_public ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  aria-label="Private board"
                  role="img"
                  className="mb-0.5 shrink-0 text-parchment-faint"
                >
                  <rect x="3" y="7" width="10" height="7" rx="2" />
                  <path d="M5.5 7V5a2.5 2.5 0 1 1 5 0v2" strokeLinecap="round" />
                </svg>
              ) : null}
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
