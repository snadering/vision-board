/**
 * Everything behind the content: three heavily-blurred colour fields drifting on
 * a minutes-long cycle, plus a film-grain layer so the flat blacks have some
 * tooth. Purely decorative, so it is hidden from assistive tech.
 */
export function Atmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-ink-900" />

      <div
        className="blob"
        style={{
          top: "-18vh",
          left: "-10vw",
          width: "72vw",
          height: "72vw",
          background:
            "radial-gradient(circle at 40% 40%, var(--color-plum) 0%, transparent 68%)",
          opacity: 0.75,
          animation: "blob-a 46s ease-in-out infinite",
        }}
      />
      <div
        className="blob"
        style={{
          bottom: "-26vh",
          right: "-14vw",
          width: "68vw",
          height: "68vw",
          background:
            "radial-gradient(circle at 55% 45%, var(--color-rose-dust) 0%, transparent 66%)",
          opacity: 0.34,
          animation: "blob-b 58s ease-in-out infinite",
        }}
      />
      <div
        className="blob"
        style={{
          top: "28vh",
          right: "8vw",
          width: "46vw",
          height: "46vw",
          background:
            "radial-gradient(circle at 50% 50%, var(--color-amber-warm) 0%, transparent 64%)",
          opacity: 0.28,
          animation: "blob-c 52s ease-in-out infinite",
        }}
      />

      {/* A vignette pulls the eye back to the middle of the board. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, transparent 30%, rgba(6,5,7,0.72) 100%)",
        }}
      />

      <svg className="absolute inset-0 h-full w-full opacity-[0.16] mix-blend-overlay">
        <filter id="vb-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#vb-grain)" />
      </svg>
    </div>
  );
}
