/**
 * A quiet darkening at the foot of a card.
 *
 * Deliberately shallow and soft: the photo is the point, so the heavy lifting
 * for legibility is done by the title's own shadow (`title-shadow`) rather than
 * by covering the image. Tags carry their own pill backgrounds and need nothing
 * from this.
 */
export function CardScrim() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-black/60 via-black/20 to-transparent"
    />
  );
}
