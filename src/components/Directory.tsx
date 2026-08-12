"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { PersonCard } from "@/components/PersonCard";
import {
  computeColumnLayout,
  computeScatterLayout,
  randomSeed,
  type Layout,
  type LayoutItem,
} from "@/lib/layout";
import { useMediaQuery } from "@/lib/use-media-query";
import type { DirectoryEntry } from "@/lib/types";

/**
 * The front page: the same scatter the boards use, with people in it. Somebody
 * with more visions is drawn a little larger, so the composition says something
 * rather than being uniform.
 */
export function Directory({
  people,
  currentUserId,
}: {
  people: DirectoryEntry[];
  currentUserId: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const isMobile = useMediaQuery("(max-width: 767px)");

  // A different arrangement on every visit, exactly as the boards behave.
  // Drawn during render, not in an effect: nothing is placed until a measured
  // width arrives, and a width only arrives on the client, so the server and
  // the first client render agree regardless of the value here.
  const [seed] = useState(() => randomSeed());

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth((current) => (Math.abs(current - next) < 1 ? current : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const items: LayoutItem[] = useMemo(
    () =>
      people.map((person) => ({
        id: person.id,
        // Avatars are square; the scatter's own scale and rotation do the rest.
        width: 1,
        height: 1,
        weight: 0.85 + Math.min(person.vision_count, 12) / 12 * 0.4,
      })),
    [people],
  );

  const layout: Layout | null = useMemo(() => {
    if (width === 0) return null;
    return isMobile
      ? computeColumnLayout(items, width, seed)
      : computeScatterLayout(items, width, seed);
  }, [items, width, isMobile, seed]);

  const byId = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );

  if (people.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-[52vh] flex-col items-center justify-center px-6 text-center"
      >
        <h2 className="font-display text-3xl text-parchment sm:text-4xl">
          Nobody here yet
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-parchment-faint">
          The first boards are still being dreamt up.
        </p>
      </motion.div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full transition-opacity duration-700 ease-[var(--ease-soft)]"
      style={{
        height: layout ? layout.height : "60vh",
        opacity: layout ? 1 : 0,
      }}
    >
      {layout
        ? layout.placements.map((placement, index) => {
            const person = byId.get(placement.id);
            if (!person) return null;
            return (
              <PersonCard
                key={person.id}
                person={person}
                placement={placement}
                index={index}
                isYou={person.id === currentUserId}
              />
            );
          })
        : null}
    </div>
  );
}
