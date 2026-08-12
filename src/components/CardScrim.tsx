/**
 * The band a card's title sits on.
 *
 * A gradient alone loses against a bright or busy photo — snow, a white wall, a
 * paint palette — so this pairs it with a lightly blurred layer, masked to fade
 * out upwards. The blur softens whatever is underneath into something flat
 * enough to read against, while the mask keeps the photo itself crisp
 * everywhere above the text.
 */
export function CardScrim() {
  const fade = "linear-gradient(to top, black 45%, rgba(0,0,0,0.55) 70%, transparent 100%)";

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%]"
        style={{
          backdropFilter: "blur(6px) saturate(0.9)",
          WebkitBackdropFilter: "blur(6px) saturate(0.9)",
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black/92 via-black/60 to-transparent"
      />
    </>
  );
}
