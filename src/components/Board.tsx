"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VisionCard } from "@/components/VisionCard";
import { EmptyState } from "@/components/EmptyState";
import {
  computeColumnLayout,
  computeScatterLayout,
  randomSeed,
  type Layout,
} from "@/lib/layout";
import { useMediaQuery } from "@/lib/use-media-query";
import type { Owner, Vision } from "@/lib/types";

type Props = {
  owner: Owner;
  visions: Vision[];
  arrivingId: string | null;
  onOpen: (vision: Vision) => void;
  onAdd: () => void;
};

export function Board({ owner, visions, arrivingId, onOpen, onAdd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const isMobile = useMediaQuery("(max-width: 767px)");

  // A fresh composition per mount, and again whenever you cross to the other
  // tab. The seed is drawn during render rather than in an effect, which is safe
  // because nothing is placed until a measured width arrives — and a width only
  // arrives from the ResizeObserver, i.e. on the client, after hydration.
  const [seedState, setSeedState] = useState(() => ({ owner, seed: randomSeed() }));
  if (seedState.owner !== owner) {
    setSeedState({ owner, seed: randomSeed() });
  }
  const seed = seedState.seed;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // The observer fires once on observe, which is what supplies the first
    // measurement.
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth((current) => (Math.abs(current - next) < 1 ? current : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout: Layout | null = useMemo(() => {
    if (width === 0) return null;
    return isMobile
      ? computeColumnLayout(visions, width, seed)
      : computeScatterLayout(visions, width, seed);
  }, [seed, width, isMobile, visions]);

  const byId = useMemo(
    () => new Map(visions.map((vision) => [vision.id, vision])),
    [visions],
  );

  const empty = visions.length === 0;

  return (
    // The measured container is always mounted, empty board or not. Returning
    // early here instead would leave the ResizeObserver with nothing to observe,
    // and since its effect runs once on mount it would never attach — the first
    // vision added to an empty board would then land in a board still held at
    // zero width, invisible until a reload.
    <div
      ref={containerRef}
      className="relative w-full transition-opacity duration-700 ease-[var(--ease-soft)]"
      style={{
        height: empty ? "auto" : layout ? layout.height : "60vh",
        opacity: empty || layout ? 1 : 0,
      }}
    >
      {empty ? <EmptyState owner={owner} onAdd={onAdd} /> : null}

      {!empty && layout
        ? layout.placements.map((placement, index) => {
            const vision = byId.get(placement.id);
            if (!vision) return null;
            return (
              <VisionCard
                key={vision.id}
                vision={vision}
                placement={placement}
                index={index}
                arriving={vision.id === arrivingId}
                onOpen={onOpen}
              />
            );
          })
        : null}
    </div>
  );
}
