"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Nav } from "@/components/Nav";
import { Board } from "@/components/Board";
import { Lightbox } from "@/components/Lightbox";
import { VisionModal } from "@/components/VisionModal";
import { OWNERS, type Owner, type Vision } from "@/lib/types";

export function BoardApp({ initialVisions }: { initialVisions: Vision[] }) {
  const [visions, setVisions] = useState(initialVisions);
  const [owner, setOwner] = useState<Owner>("sander");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Vision | null>(null);
  const [opened, setOpened] = useState<Vision | null>(null);
  const [arrivingId, setArrivingId] = useState<string | null>(null);

  // Server data wins if the route is refreshed underneath us. Adjusting state
  // during render (rather than in an effect) avoids a throwaway pass with stale
  // cards on screen.
  const [serverVisions, setServerVisions] = useState(initialVisions);
  if (serverVisions !== initialVisions) {
    setServerVisions(initialVisions);
    setVisions(initialVisions);
  }

  const byOwner = useMemo(() => {
    const grouped = Object.fromEntries(
      OWNERS.map((person) => [person, [] as Vision[]]),
    ) as Record<Owner, Vision[]>;
    for (const vision of visions) grouped[vision.owner]?.push(vision);
    return grouped;
  }, [visions]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        OWNERS.map((person) => [person, byOwner[person].length]),
      ) as Record<Owner, number>,
    [byOwner],
  );

  const onSaved = useCallback((vision: Vision, mode: "created" | "updated") => {
    setVisions((current) =>
      mode === "created"
        ? [vision, ...current]
        : current.map((item) => (item.id === vision.id ? vision : item)),
    );
    // Keep an open lightbox showing the edited record rather than a stale copy.
    setOpened((current) => (current?.id === vision.id ? vision : current));
    setAdding(false);
    setEditing(null);
    // Follow the vision to whichever board it now belongs to.
    setOwner(vision.owner);

    if (mode === "created") {
      setArrivingId(vision.id);
      window.setTimeout(() => setArrivingId(null), 2000);
    }
  }, []);

  const onDeleted = useCallback((id: string) => {
    setVisions((current) => current.filter((vision) => vision.id !== id));
    setOpened(null);
  }, []);

  // Stable identities: both dialogs key their Escape/focus-trap effect on the
  // close handler, so a fresh closure on every render would tear the trap down
  // and re-grab focus each time anything above them re-rendered.
  const openAdd = useCallback(() => setAdding(true), []);
  const closeModal = useCallback(() => {
    setAdding(false);
    setEditing(null);
  }, []);
  const closeLightbox = useCallback(() => setOpened(null), []);

  return (
    <>
      <Nav
        owner={owner}
        onOwnerChange={setOwner}
        onAdd={openAdd}
        counts={counts}
      />

      <main className="mx-auto w-full max-w-7xl grow px-4 pt-4 pb-24 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={owner}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Board
              owner={owner}
              visions={byOwner[owner]}
              arrivingId={arrivingId}
              onOpen={setOpened}
              onEdit={setEditing}
              onAdd={openAdd}
            />
          </motion.div>
        </AnimatePresence>
      </main>

      <VisionModal
        open={adding || editing !== null}
        vision={editing}
        onClose={closeModal}
        onSaved={onSaved}
      />

      <Lightbox
        vision={opened}
        onClose={closeLightbox}
        onDeleted={onDeleted}
      />
    </>
  );
}
