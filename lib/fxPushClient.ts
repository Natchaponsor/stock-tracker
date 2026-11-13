"use client";

import { toPushAlert } from "./fxPushPlan";
import type { FxAlert } from "./types";

/**
 * Opt-in FX push, on this device. The push id and its write token live in
 * localStorage under their own key: per device, never in the book, exports or
 * URLs, and unrelated to the sync code.
 */

const STORAGE_KEY = "stock-tracker-fx-push";
const CHANGE_EVENT = "stock-tracker-fx-push-change";

interface PushConfig {
  pushId: string;
  token: string;
}

export type PushState =
  /** Server render / not known yet. */
  | "unknown"
  | "unsupported"
  /** iPhone/iPad in a Safari tab: push needs the app on the Home Screen. */
  | "needs-install"
  /** This deploy has no VAPID key. */
  | "unconfigured"
  | "denied"
  | "off"
  | "on";

function readConfig(): PushConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PushConfig) : null;
    return parsed && /^[0-9a-f]{32}$/.test(parsed.pushId) && /^[0-9a-f]{64}$/.test(parsed.token) ? parsed : null;
  } catch {
    return null;
  }
}

function writeConfig(config: PushConfig | null) {
  try {
    if (config) localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: push simply stays off.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribePushState(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function getPushState(): PushState {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  return readConfig() ? "on" : "off";
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function put(config: PushConfig, subscription: PushSubscription, alerts: FxAlert[]): Promise<void> {
  const res = await fetch(`/api/fx/push/${config.pushId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), alerts: alerts.map(toPushAlert) }),
  });
  if (!res.ok) throw new Error(res.status === 503 ? "Push isn't set up on this server yet." : `Push server error (${res.status}).`);
}

/** Asks for permission, subscribes this browser, and uploads the alerts. Throws a readable message on failure. */
export async function enablePush(alerts: FxAlert[]): Promise<void> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("Push isn't set up on this server yet.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked for this site. Allow them in your browser settings.");
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) throw new Error("Push needs the app's service worker, which only runs in the deployed app.");
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) }));
  const config = readConfig() ?? { pushId: randomHex(16), token: randomHex(32) };
  await put(config, subscription, alerts);
  writeConfig(config);
}

/** Re-uploads the alerts after they change, if push is on. Failures are retried on the next change. */
export async function uploadPushAlerts(alerts: FxAlert[]): Promise<void> {
  const config = readConfig();
  if (!config || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    // The browser dropped the subscription; push is effectively off.
    writeConfig(null);
    return;
  }
  await put(config, subscription, alerts);
}

/** Deletes this device's record on the server and unsubscribes. */
export async function disablePush(): Promise<void> {
  const config = readConfig();
  if (config) {
    await fetch(`/api/fx/push/${config.pushId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.token}` },
    }).catch(() => {});
  }
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  await (await registration?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
  writeConfig(null);
}
