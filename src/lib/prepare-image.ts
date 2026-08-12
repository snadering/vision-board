"use client";

import {
  ACCEPTED_INPUT_EXTENSIONS,
  ACCEPTED_INPUT_MIME,
  MAX_EDGE,
  MAX_ORIGINAL_BYTES,
} from "@/lib/types";

/**
 * Browser-side image preparation.
 *
 * A photo straight off a phone is 6–12 MB, and Vercel caps a request body at
 * ~4.5 MB, so the file is decoded, downscaled and re-encoded here. Natural
 * dimensions are captured before any resizing, because the board renders every
 * card at the image's true aspect ratio.
 */

export type PreparedImage = {
  file: File;
  /** Natural pixel dimensions of the original. */
  width: number;
  height: number;
  previewUrl: string;
  originalBytes: number;
};

const READABLE_FORMATS = "JPEG, PNG, WebP or HEIC";

export class ImageError extends Error {}

function extensionOf(name: string): string {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1]! : "";
}

export function validateFile(file: File): void {
  const mimeOk = (ACCEPTED_INPUT_MIME as readonly string[]).includes(
    file.type.toLowerCase(),
  );
  const extensionOk = (ACCEPTED_INPUT_EXTENSIONS as readonly string[]).includes(
    extensionOf(file.name),
  );

  // Both signals must agree: a renamed .pdf and an unlabelled .gif are both out.
  if (!mimeOk || !extensionOk) {
    throw new ImageError(`That's not an image we can use. Try ${READABLE_FORMATS}.`);
  }

  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new ImageError(
      `That file is ${(file.size / (1024 * 1024)).toFixed(0)} MB. Keep it under 25 MB.`,
    );
  }
}

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> path — some browsers refuse HEIC here but
      // manage it through the image decoder.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("decode failed"));
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageError(
      "This browser could not read that image. HEIC photos may need to be exported as JPEG first.",
    );
  }
}

function encode(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  validateFile(file);

  const decoded = await decode(file);
  const { width, height } = decoded;
  if (width === 0 || height === 0) {
    decoded.release();
    throw new ImageError("That image appears to be empty.");
  }

  try {
    // Downscale only. An image already under the cap is left at its own size.
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new ImageError("This browser cannot process images.");
    context.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);

    let blob = await encode(canvas, "image/webp", 0.85);
    // Safari used to hand back a PNG when asked for WebP; check what we got.
    if (!blob || blob.type !== "image/webp") {
      blob = await encode(canvas, "image/jpeg", 0.85);
    }
    if (!blob) throw new ImageError("Could not process that image.");

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "vision";

    return {
      file: new File([blob], `${base}.${extension}`, { type: blob.type }),
      width,
      height,
      previewUrl: URL.createObjectURL(blob),
      originalBytes: file.size,
    };
  } finally {
    decoded.release();
  }
}
