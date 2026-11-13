/**
 * This device's identity in the synced device list: a random id and a name the
 * user can change. Kept per device in localStorage, outside the book and apart
 * from the sync code.
 */

export const DEVICE_KEY = "stock-tracker-device";

export interface LocalDevice {
  id: string;
  name: string;
}

/** "iPhone · Safari", "Mac · Chrome", from the browser's user agent. */
export function guessDeviceName(userAgent: string): string {
  const ua = userAgent;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux|CrOS/.test(ua)
              ? "Linux"
              : "This device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\/|FxiOS/.test(ua)
      ? "Firefox"
      : /Chrome\/|CriOS/.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : null;
  return browser ? `${os} · ${browser}` : os;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** This device's id and name, created on first use. Browser only. */
export function getLocalDevice(): LocalDevice {
  try {
    const raw = window.localStorage.getItem(DEVICE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDevice>;
      if (typeof parsed.id === "string" && parsed.id && typeof parsed.name === "string" && parsed.name.trim()) {
        return { id: parsed.id, name: parsed.name };
      }
    }
  } catch {
    // Unreadable entry: start a new one below.
  }
  const device = { id: newId(), name: guessDeviceName(navigator.userAgent) };
  try {
    window.localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  } catch {
    // Storage blocked: the id lasts for this visit only.
  }
  return device;
}

export const MAX_DEVICE_NAME = 40;

/** Renames this device. Returns the saved device. */
export function setLocalDeviceName(name: string): LocalDevice {
  const trimmed = name.trim().slice(0, MAX_DEVICE_NAME);
  const device = { ...getLocalDevice(), ...(trimmed ? { name: trimmed } : {}) };
  try {
    window.localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  } catch {
    // Storage blocked: keep the name for this visit.
  }
  return device;
}
