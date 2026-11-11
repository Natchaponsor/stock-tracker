import { ImageResponse } from "next/og";
import { token } from "./tokens";

/**
 * The installed app's icon: the Navy Stream silk square (the brand mark used in
 * the sidebar and header) with a white rising line on it. Drawn at build time.
 *
 * - "rounded": transparent corners, for browsers and desktop installs.
 * - "full":    edge-to-edge square. iOS and Android cut their own shape from it,
 *              so the mark stays inside the central safe zone.
 */
export function appIcon(size: number, shape: "rounded" | "full"): ImageResponse {
  const mark = Math.round(size * (shape === "full" ? 0.5 : 0.58));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: shape === "rounded" ? size * 0.22 : 0,
          backgroundImage: `radial-gradient(circle at 15% 0%, ${token("hero-glow")} 0%, transparent 62%), radial-gradient(circle at 95% 15%, ${token("hero-mid")} 0%, transparent 55%), linear-gradient(165deg, ${token("hero-base")} 0%, ${token("hero-deep")} 100%)`,
        }}
      >
        <svg
          width={mark}
          height={mark}
          viewBox="0 0 24 24"
          fill="none"
          stroke={token("on-primary")}
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 17l5.5-5.5 4 4L21 7" />
          <path d="M15 7h6v6" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
