/**
 * Placeholder cards in roughly the shape the real scatter takes, so the first
 * paint already reads as a board rather than as an empty page. Fixed positions
 * (no seeded randomness) keep this safe to render on the server.
 */
const SHAPES = [
  { left: "4%", top: "2%", width: "24%", ratio: 0.72, rotate: -3 },
  { left: "33%", top: "8%", width: "26%", ratio: 1.35, rotate: 2 },
  { left: "64%", top: "1%", width: "23%", ratio: 1, rotate: -1.5 },
  { left: "8%", top: "42%", width: "22%", ratio: 1.28, rotate: 3.5 },
  { left: "36%", top: "52%", width: "25%", ratio: 0.78, rotate: -2.5 },
  { left: "67%", top: "44%", width: "24%", ratio: 1.1, rotate: 1.8 },
];

export function BoardSkeleton() {
  return (
    <div aria-hidden className="relative h-[70vh] w-full">
      {SHAPES.map((shape, index) => (
        <div
          key={index}
          className="absolute overflow-hidden rounded-[var(--radius-glass)] border border-white/[0.07] bg-white/[0.035]"
          style={{
            left: shape.left,
            top: shape.top,
            width: shape.width,
            aspectRatio: `1 / ${shape.ratio}`,
            transform: `rotate(${shape.rotate}deg)`,
          }}
        >
          <div className="shimmer h-full w-full" />
        </div>
      ))}
    </div>
  );
}
