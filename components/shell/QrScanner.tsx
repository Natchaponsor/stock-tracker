"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Reads a QR code with the device camera, inside the app. The iPhone Home Screen
 * app needs this: a QR scanned with the Camera app opens Safari, which has its
 * own separate storage. Calls `onResult` once with the decoded text.
 */
export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const supported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    if (!supported) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    function scan() {
      const video = videoRef.current;
      if (!video || !context || done.current) return;
      if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (code?.data) {
          done.current = true;
          onResult(code.data);
          return;
        }
      }
      frame = requestAnimationFrame(scan);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        void video.play();
        frame = requestAnimationFrame(scan);
      })
      .catch(() => setError("Camera not available. Allow camera access, or type the code instead."));

    return () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onResult, supported]);

  if (!supported) {
    return (
      <p className="ns-label rounded-ns-md bg-ns-sunken p-3 font-normal text-ns-ink-muted">
        This browser can&apos;t use the camera here. Type the code instead.
      </p>
    );
  }
  if (error) return <p className="ns-label rounded-ns-md bg-ns-sunken p-3 font-normal text-ns-ink-muted">{error}</p>;
  return (
    <div className="relative overflow-hidden rounded-ns-md bg-ns-ink">
      <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-ns-md border-2 border-ns-on-primary/80" />
      <p className="ns-caption absolute inset-x-0 bottom-2 text-center text-ns-on-primary">Point at the QR code on your other device</p>
    </div>
  );
}
