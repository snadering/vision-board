"use client";

/**
 * A painted stand-in for a vision that has no photograph yet.
 *
 * Rendered to a real image and uploaded like any other, so nothing downstream
 * has to know the difference: it appears in the lightbox, keeps a true aspect
 * ratio, and can be swapped for a photograph later without ceremony.
 */

/**
 * Pastels chosen to sit in a dim room rather than shout in it — soft, a little
 * desaturated, and warm enough to belong beside the amber accent.
 */
const PALETTE: readonly (readonly [string, string, string])[] = [
  ["#f6d5c8", "#e7b7c3", "#c9a9d1"], // apricot → rose → lilac
  ["#d9e2ec", "#c7d3e8", "#c3b7de"], // powder blue → periwinkle
  ["#e8dcc8", "#dcc9b6", "#c9a99a"], // sand → clay
  ["#cfe3d8", "#bcd6cb", "#a9c4c9"], // sage → eucalyptus
  ["#f3d9d2", "#dfb9bd", "#b799b8"], // shell → mauve
  ["#e6dced", "#cfc3e4", "#b3c4e0"], // lavender → cornflower
  ["#fae0cd", "#f0c6b5", "#d5a29b"], // peach → terracotta
  ["#d8e0d0", "#c2cfc0", "#a8bcae"], // moss → celadon
  ["#e9d8e4", "#d3bcd8", "#b0a6cf"], // blossom → wisteria
  ["#fbe3d0", "#e9c6c0", "#c8a6c0"], // cream → dusty pink
];

/** A few shapes, so a board of painted cards is not a grid of squares. */
const SHAPES: readonly (readonly [number, number])[] = [
  [1000, 1000],
  [1000, 1250],
  [1000, 750],
  [1200, 900],
  [900, 1200],
];

export type GradientSpec = {
  colors: readonly [string, string, string];
  angle: number;
  width: number;
  height: number;
};

export function randomGradient(): GradientSpec {
  const colors = PALETTE[Math.floor(Math.random() * PALETTE.length)]!;
  const [width, height] = SHAPES[Math.floor(Math.random() * SHAPES.length)]!;
  return {
    colors,
    angle: Math.floor(Math.random() * 360),
    width,
    height,
  };
}

/** The same gradient as CSS, for previewing before anything is uploaded. */
export function gradientCss(spec: GradientSpec): string {
  const [from, via, to] = spec.colors;
  return `linear-gradient(${spec.angle}deg, ${from} 0%, ${via} 52%, ${to} 100%)`;
}

/**
 * Paints the gradient and hands back a file ready to upload. A soft off-centre
 * highlight keeps it from reading as a flat CSS rectangle.
 */
export async function renderGradient(spec: GradientSpec): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot paint an image.");

  const radians = (spec.angle * Math.PI) / 180;
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  const linear = context.createLinearGradient(
    spec.width / 2 - (x * spec.width) / 2,
    spec.height / 2 - (y * spec.height) / 2,
    spec.width / 2 + (x * spec.width) / 2,
    spec.height / 2 + (y * spec.height) / 2,
  );
  const [from, via, to] = spec.colors;
  linear.addColorStop(0, from);
  linear.addColorStop(0.52, via);
  linear.addColorStop(1, to);
  context.fillStyle = linear;
  context.fillRect(0, 0, spec.width, spec.height);

  const glow = context.createRadialGradient(
    spec.width * 0.32,
    spec.height * 0.28,
    0,
    spec.width * 0.32,
    spec.height * 0.28,
    Math.max(spec.width, spec.height) * 0.75,
  );
  glow.addColorStop(0, "rgba(255,255,255,0.30)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, spec.width, spec.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.9);
  });
  const usable =
    blob && blob.type === "image/webp"
      ? blob
      : await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", 0.9);
        });

  if (!usable) throw new Error("Could not paint an image.");

  return new File([usable], `gradient.${usable.type === "image/webp" ? "webp" : "jpg"}`, {
    type: usable.type,
  });
}
