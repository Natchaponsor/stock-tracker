"use client";

import { useSyncExternalStore } from "react";

/** Navy Stream's web set starts at `bp-tablet` (768px); below it is the phone set. */
const WEB_QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WEB_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): "web" | "phone" {
  return window.matchMedia(WEB_QUERY).matches ? "web" : "phone";
}

function getServerSnapshot(): null {
  return null;
}

/**
 * Which Navy Stream set this screen gets: "web" from 768px, "phone" below.
 * `null` on the server and during hydration, when the width is unknown. Callers
 * then render both sets and let CSS (`md:hidden` / `hidden md:…`) pick one, so the
 * first paint is right; once the width is known only the matching set is rendered.
 * Resizing across 768px switches sets live.
 */
export function usePlatform(): "web" | "phone" | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
