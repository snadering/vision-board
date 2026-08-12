"use client";

import { useCallback, useMemo, useState } from "react";
import { Board } from "@/components/Board";
import { Lightbox } from "@/components/Lightbox";
import { VisionModal } from "@/components/VisionModal";
import type { Profile, Vision } from "@/lib/types";

type Props = {
  /** Whose board this is. */
  owner: Pick<Profile, "id" | "username">;
  initialVisions: Vision[];
  /** True only when the viewer is the owner. The server decides this. */
  canEdit: boolean;
};

export function BoardApp({ owner, initialVisions, canEdit }: Props) {
  const [visions, setVisions] = useState(initialVisions);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Vision | null>(null);
  const [opened, setOpened] = useState<Vision | null>(null);
  const [arrivingId, setArrivingId] = useState<string | null>(null);

  // Server data wins if the route is refreshed underneath us.
  const [serverVisions, setServerVisions] = useState(initialVisions);
  if (serverVisions !== initialVisions) {
    setServerVisions(initialVisions);
    setVisions(initialVisions);
  }

  const count = visions.length;

  const onSaved = useCallback((vision: Vision, mode: "created" | "updated") => {
    setVisions((current) =>
      mode === "created"
        ? [vision, ...current]
        : current.map((item) => (item.id === vision.id ? vision : item)),
    );
    setOpened((current) => (current?.id === vision.id ? vision : current));
    setAdding(false);
    setEditing(null);

    if (mode === "created") {
      setArrivingId(vision.id);
      window.setTimeout(() => setArrivingId(null), 2000);
    }
  }, []);

  const onDeleted = useCallback((id: string) => {
    setVisions((current) => current.filter((vision) => vision.id !== id));
    setOpened(null);
  }, []);

  const openAdd = useCallback(() => setAdding(true), []);
  const closeModal = useCallback(() => {
    setAdding(false);
    setEditing(null);
  }, []);
  const closeLightbox = useCallback(() => setOpened(null), []);

  const subtitle = useMemo(() => {
    if (count === 0) return canEdit ? "Nothing pinned yet" : "Nothing here yet";
    return `${count} vision${count === 1 ? "" : "s"}`;
  }, [count, canEdit]);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-parchment-faint">{subtitle}</p>
          <h1 className="mt-1.5 font-display text-4xl leading-none text-parchment sm:text-5xl">
            {canEdit ? "Your board" : `${owner.username}'s board`}
          </h1>
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={openAdd}
            className="cursor-pointer rounded-full border border-ember/30 bg-ember/12 px-5 py-2 text-sm whitespace-nowrap text-ember-soft shadow-[0_0_30px_-10px_color-mix(in_oklab,var(--color-ember)_60%,transparent)] transition-all duration-300 hover:bg-ember/22 active:scale-[0.98]"
          >
            Add Vision
          </button>
        ) : null}
      </div>

      <Board
        boardKey={owner.id}
        visions={visions}
        arrivingId={arrivingId}
        canEdit={canEdit}
        ownerName={owner.username}
        onOpen={setOpened}
        onEdit={setEditing}
        onAdd={openAdd}
      />

      {canEdit ? (
        <VisionModal
          open={adding || editing !== null}
          vision={editing}
          onClose={closeModal}
          onSaved={onSaved}
        />
      ) : null}

      <Lightbox
        vision={opened}
        canEdit={canEdit}
        onClose={closeLightbox}
        onDeleted={onDeleted}
      />
    </>
  );
}
