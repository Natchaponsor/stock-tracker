"use client";

import { useSyncExternalStore } from "react";

/** Chrome/Edge/Android's install event. Not in the DOM typings yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallState {
  /** The browser offered an install prompt we can show (Chrome, Edge, Android). */
  canPrompt: boolean;
  /** Running as the installed app already. */
  installed: boolean;
  /** iPhone or iPad: no prompt exists; installing is Share → Add to Home Screen. */
  isIos: boolean;
}

const SERVER_STATE: InstallState = { canPrompt: false, installed: false, isIos: false };

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = SERVER_STATE;
let listening = false;
const listeners = new Set<() => void>();

function update(patch: Partial<InstallState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

/**
 * Starts listening for the browser's install offer. Called from the always-mounted
 * ServiceWorker component, because the event can fire before any menu is opened.
 */
export function listenForInstall() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const nav = navigator as Navigator & { standalone?: boolean };
  state = {
    canPrompt: false,
    installed: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
    // iPadOS reports itself as a Mac, so check for touch as well.
    isIos: /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1),
  };
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // keep it for our own "Install app" item
    deferred = event as BeforeInstallPromptEvent;
    update({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    update({ canPrompt: false, installed: true });
  });
}

/** Shows the browser's install dialog, if it offered one. */
export async function promptInstall() {
  if (!deferred) return;
  const event = deferred;
  deferred = null;
  update({ canPrompt: false });
  await event.prompt();
  await event.userChoice;
}

export function useInstallApp(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => SERVER_STATE
  );
}
