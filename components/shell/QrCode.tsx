"use client";

import { useMemo } from "react";
import QRCode from "qrcode";

/**
 * A QR code drawn as SVG squares. Always dark navy on white (on-primary /
 * ocean-900 are the same in both themes), because inverted codes scan badly.
 */
export function QrCode({ value, size = 184, label }: { value: string; size?: number; label: string }) {
  const { count, path } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    let d = "";
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (qr.modules.get(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { count: n, path: d };
  }, [value]);

  const quiet = 3; // white margin, in modules, that scanners need
  const span = count + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`${-quiet} ${-quiet} ${span} ${span}`}
      shapeRendering="crispEdges"
      className="rounded-ns-md bg-ns-on-primary"
    >
      <path d={path} fill="var(--ocean-900)" />
    </svg>
  );
}
