/**
 * Anything the scatter can place: visions on a board, people in the directory.
 * All it needs is an identity and an aspect ratio.
 */
export type LayoutItem = {
  id: string;
  width: number;
  height: number;
  /**
   * Relative prominence, 1 being ordinary. The directory uses it to draw people
   * with more visions a little larger.
   */
  weight?: number;
  /**
   * Largest this item may ever be drawn, in pixels. Profile pictures come from
   * Google at 96px, so the directory caps them rather than letting a wide
   * screen enlarge a small source into mush.
   */
  maxWidth?: number;
};

/**
 * Seeded scatter placement.
 *
 * Every mount draws a fresh seed, so the same set of visions composes
 * differently on every load, while a single render stays perfectly stable — the
 * randomness all flows from one `mulberry32` stream rather than scattered
 * `Math.random()` calls.
 */

export type Placement = {
  id: string;
  /** Position and size in pixels, relative to the board box. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  z: number;
  /** Drift amplitudes, consumed as CSS custom properties. */
  driftX: number;
  driftY: number;
  driftRotate: number;
  driftDuration: number;
  /** Negative, so each card starts mid-cycle instead of at zero. */
  driftDelay: number;
};

export type Layout = {
  placements: Placement[];
  height: number;
};

/** Small, fast, well-distributed 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

function shuffle<T>(items: readonly T[], rnd: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const EDGE_PADDING = 10;
/** Fraction of the smaller card's area that two cards may share. */
const MAX_OVERLAP_RATIO = 0.08;
/** Bottom band of a card holding the title; nothing may be laid over it. */
const TITLE_BAND = 0.3;

type Box = { x: number; y: number; width: number; height: number };

function intersection(a: Box, b: Box): { w: number; h: number } {
  return {
    w: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
    h: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  };
}

function driftFor(rnd: () => number, amplitude: number) {
  const duration = 18 + rnd() * 12; // 18–30s
  return {
    driftX: (6 + rnd() * 6) * (rnd() < 0.5 ? -1 : 1) * amplitude,
    driftY: (6 + rnd() * 6) * (rnd() < 0.5 ? -1 : 1) * amplitude,
    driftRotate: (0.6 + rnd() * 0.9) * (rnd() < 0.5 ? -1 : 1) * amplitude,
    driftDuration: duration,
    driftDelay: -rnd() * duration,
  };
}

/**
 * Nudges cards apart until no pair shares more than `MAX_OVERLAP_RATIO` of the
 * smaller card's area, and nothing is laid across the title band of the card
 * beneath it.
 *
 * Horizontal separation is used when it is the cheaper correction *and* both
 * cards can absorb it without leaving the board. Otherwise the pair is split
 * vertically, which always succeeds: the board grows downwards, so there is no
 * bound to fight. That guarantee is what makes the loop converge.
 */
function relax(boxes: Placement[], containerWidth: number): void {
  const maxXFor = (box: Placement) =>
    Math.max(EDGE_PADDING, containerWidth - box.width - EDGE_PADDING);

  for (let pass = 0; pass < 80; pass++) {
    let settled = true;

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const { w, h } = intersection(a, b);
        if (w <= 0 || h <= 0) continue;

        const allowed =
          MAX_OVERLAP_RATIO * Math.min(a.width * a.height, b.width * b.height);

        // The card drawn on top must keep clear of the other's title band.
        const [upper, lower] = a.z > b.z ? [a, b] : [b, a];
        const band = intersection(upper, {
          x: lower.x,
          y: lower.y + lower.height * (1 - TITLE_BAND),
          width: lower.width,
          height: lower.height * TITLE_BAND,
        });
        const coversTitle = band.w > 0 && band.h > 0;

        if (w * h <= allowed && !coversTitle) continue;
        settled = false;

        // Displacement that brings the shared area back inside the budget,
        // solved per axis; clearing a title band needs the full overlap gone.
        let needX = Math.max(0, w - allowed / h);
        let needY = Math.max(0, h - allowed / w);
        if (coversTitle) {
          needX = Math.max(needX, band.w);
          needY = Math.max(needY, band.h);
        }
        needX += 1;
        needY += 1;

        const [left, right] =
          a.x + a.width / 2 <= b.x + b.width / 2 ? [a, b] : [b, a];
        const horizontalRoom =
          left.x - EDGE_PADDING + (maxXFor(right) - right.x);

        if (needX <= needY && horizontalRoom >= needX) {
          const leftMove = Math.min(needX / 2, left.x - EDGE_PADDING);
          left.x -= leftMove;
          right.x = Math.min(right.x + (needX - leftMove), maxXFor(right));
        } else {
          const [top, bottom] =
            a.y + a.height / 2 <= b.y + b.height / 2 ? [a, b] : [b, a];
          const topMove = Math.min(needY / 2, Math.max(0, top.y - EDGE_PADDING));
          top.y -= topMove;
          bottom.y += needY - topMove;
        }
      }
    }

    if (settled) break;
  }
}

export type ScatterOptions = {
  /**
   * Largest a grid cell may be. Lowering it clusters small items together
   * instead of stranding each one in the middle of a cell sized for a poster.
   */
  cellCap?: number;
};

export function computeScatterLayout(
  visions: readonly LayoutItem[],
  containerWidth: number,
  seed: number,
  options: ScatterOptions = {},
): Layout {
  if (visions.length === 0 || containerWidth <= 0) {
    return { placements: [], height: 0 };
  }

  const rnd = mulberry32(seed);
  const ordered = shuffle(visions, rnd);
  const count = ordered.length;

  const cellCap = options.cellCap ?? 440;

  // Enough columns to fill the width, but never so many that a handful of
  // visions ends up as a thin row of stamps.
  const byWidth = Math.max(2, Math.round(containerWidth / (cellCap * 0.82)));
  const byCount = Math.max(2, Math.ceil(Math.sqrt(count * 1.25)));
  const cols = Math.max(1, Math.min(byWidth, byCount, count));

  // Cells are capped so a board holding two visions composes them at a normal
  // card size in a centred band, rather than blowing them up to poster scale.
  const cellWidth = Math.min(containerWidth / cols, cellCap);
  const cellHeight = cellWidth * 0.95;
  const baseWidth = cellWidth * 0.74;
  const originX = (containerWidth - cellWidth * cols) / 2;

  const placements: Placement[] = ordered.map((vision, index) => {
    const scale = 0.85 + rnd() * 0.3;
    let width = baseWidth * scale * (vision.weight ?? 1);

    const aspect = vision.width / Math.max(vision.height, 1);
    let height = width / aspect;

    // Very tall images are bounded by height instead of width, so a portrait
    // shot never towers over the board — the aspect ratio itself is untouched.
    const maxHeight = cellHeight * 1.3;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }
    const maxWidth = Math.min(cellWidth * 0.95, vision.maxWidth ?? Infinity);
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspect;
    }

    const col = index % cols;
    const row = Math.floor(index / cols);
    const jitterX = (rnd() * 2 - 1) * cellWidth * 0.2;
    const jitterY = (rnd() * 2 - 1) * cellHeight * 0.2;

    // Jitter can throw a card past an edge; pull it back before relaxation runs,
    // since every move relaxation makes preserves the bounds it starts with.
    const x = originX + col * cellWidth + (cellWidth - width) / 2 + jitterX;
    const y = row * cellHeight + (cellHeight - height) / 2 + jitterY;

    return {
      id: vision.id,
      x: Math.min(
        Math.max(x, EDGE_PADDING),
        Math.max(EDGE_PADDING, containerWidth - width - EDGE_PADDING),
      ),
      y: Math.max(y, EDGE_PADDING),
      width,
      height,
      rotate: (rnd() * 2 - 1) * 5,
      z: index + 1,
      ...driftFor(rnd, 1),
    };
  });

  // Layering is independent of placement order, so overlaps stack differently
  // each time.
  const zOrder = shuffle(
    placements.map((_, index) => index + 1),
    rnd,
  );
  placements.forEach((placement, index) => {
    placement.z = zOrder[index]!;
  });

  relax(placements, containerWidth);

  const height = placements.reduce(
    (tallest, placement) => Math.max(tallest, placement.y + placement.height),
    0,
  );

  return { placements, height: height + EDGE_PADDING * 2 };
}

/**
 * Below `md` the scatter has nowhere to go, so cards run in a single column with
 * alternating offsets and tilts. Still shuffled, still a different composition
 * on every load.
 */
export function computeColumnLayout(
  visions: readonly LayoutItem[],
  containerWidth: number,
  seed: number,
): Layout {
  if (visions.length === 0 || containerWidth <= 0) {
    return { placements: [], height: 0 };
  }

  const rnd = mulberry32(seed);
  const ordered = shuffle(visions, rnd);
  const gap = 26;

  let cursor = EDGE_PADDING;
  const placements: Placement[] = ordered.map((vision, index) => {
    const width = Math.min(
      containerWidth * (0.78 + rnd() * 0.08),
      vision.maxWidth ?? Infinity,
    );
    const aspect = vision.width / Math.max(vision.height, 1);
    let height = width / aspect;
    const maxHeight = containerWidth * 1.45;
    let finalWidth = width;
    if (height > maxHeight) {
      height = maxHeight;
      finalWidth = height * aspect;
    }

    const lean = index % 2 === 0 ? -1 : 1;
    const offset = lean * containerWidth * (0.02 + rnd() * 0.05);
    const x = Math.min(
      Math.max((containerWidth - finalWidth) / 2 + offset, EDGE_PADDING),
      Math.max(EDGE_PADDING, containerWidth - finalWidth - EDGE_PADDING),
    );

    const placement: Placement = {
      id: vision.id,
      x,
      y: cursor,
      width: finalWidth,
      height,
      rotate: lean * (1 + rnd() * 2),
      z: index + 1,
      // Half amplitude: a narrow column magnifies movement.
      ...driftFor(rnd, 0.5),
    };

    cursor += height + gap;
    return placement;
  });

  return { placements, height: cursor + EDGE_PADDING };
}
