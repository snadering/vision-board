import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** A lit frame on a dark ground — the board in miniature. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a0c",
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 17,
            height: 21,
            borderRadius: 4,
            background: "linear-gradient(140deg, #f0c3a8 0%, #d98d9c 100%)",
            transform: "rotate(-8deg)",
          }}
        />
      </div>
    ),
    size,
  );
}
