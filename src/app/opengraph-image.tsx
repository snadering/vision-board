import { ImageResponse } from "next/og";

export const alt = "Vision Board — a room of dream boards.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a0c",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -140,
            width: 760,
            height: 760,
            borderRadius: 9999,
            background:
              "radial-gradient(circle at 45% 45%, #2a1b3d 0%, rgba(42,27,61,0) 68%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -240,
            right: -160,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background:
              "radial-gradient(circle at 50% 50%, #8c5a6b 0%, rgba(140,90,107,0) 66%)",
            opacity: 0.5,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 86,
            letterSpacing: -1,
            color: "#f2ece8",
          }}
        >
          Vision Board
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#e6a380",
          }}
        >
          A room of dream boards
        </div>
      </div>
    ),
    size,
  );
}
