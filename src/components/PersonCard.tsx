"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import type { Placement } from "@/lib/layout";
import type { DirectoryEntry } from "@/lib/types";
import { BLUR_DATA_URL, cardImageUrl } from "@/lib/image-url";
import { CardScrim } from "@/components/CardScrim";

type Props = {
  person: DirectoryEntry;
  placement: Placement;
  index: number;
  /** The signed-in person's own card is marked, so they can find themselves. */
  isYou: boolean;
};

export function PersonCard({ person, placement, index, isYou }: Props) {
  // Tracks the stored URL, so a newly uploaded picture replaces the old one
  // without waiting for a reload.
  const [image, setImage] = useState(() => ({
    from: person.avatar_url,
    src: person.avatar_url ? cardImageUrl(person.avatar_url, 600) : null,
    loaded: false,
  }));
  if (image.from !== person.avatar_url) {
    setImage({
      from: person.avatar_url,
      src: person.avatar_url ? cardImageUrl(person.avatar_url, 600) : null,
      loaded: false,
    });
  }

  // An image already in the browser cache can finish before React attaches
  // onLoad, in which case that event never fires and the card would sit at
  // zero opacity forever. The ref catches that case on mount, and keying the
  // element on its src makes the ref run again whenever the photo changes.
  const markLoaded = useCallback(
    () =>
      setImage((current) =>
        current.loaded ? current : { ...current, loaded: true },
      ),
    [],
  );

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
            {image.src ? (
              <>
                {/*
                  People are drawn in square cards, but a profile picture is
                  whatever shape its owner uploaded. Cropping one to fit takes
                  a slice out of the middle of somebody's face, so the picture
                  is fitted whole and a blurred, enlarged copy of itself fills
                  the space left over. Same src as the layer above, so the
                  browser fetches it once.
                */}
                <Image
                  src={image.src}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(max-width: 767px) 84vw, 26vw"
                  className="scale-125 object-cover opacity-45 blur-xl"
                />
                <Image
                  key={image.src}
                  ref={(node) => {
                    if (node?.complete && node.naturalWidth > 0) markLoaded();
                  }}
                  src={image.src}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 84vw, 26vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  loading={index < 4 ? "eager" : "lazy"}
                  onLoad={markLoaded}
                  onError={() =>
                    setImage((current) =>
                      !person.avatar_url || current.src === person.avatar_url
                        ? current
                        : { ...current, src: person.avatar_url },
                    )
                  }
                  className={`object-contain transition-opacity duration-700 ${
                    image.loaded ? "opacity-100" : "opacity-0"
                  }`}
                />
              </>
            ) : (
              // No picture: the initial, set in the display serif.
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-plum/60 to-ink-800">
                <span className="font-display text-5xl text-parchment/70">
                  {person.username.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}

            <CardScrim />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 p-2.5 text-left">
              <div className="min-w-0">
                <h3 className="title-shadow truncate font-display text-base leading-tight text-parchment">
                  {person.username}
                  {isYou ? (
                    <span className="ml-2 align-middle text-[10px] tracking-widest text-ember-soft/80 uppercase">
                      you
                    </span>
                  ) : null}
                </h3>
                <p className="title-shadow mt-0.5 text-[10px] text-parchment-faint">
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
                  <path
                    d="M5.5 7V5a2.5 2.5 0 1 1 5 0v2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : null}
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
