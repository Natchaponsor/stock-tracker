"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Points the browser's theme-color (the phone status bar, the installed app's
 * title bar) at the current header colour, read from the live --surface-card token.
 */
function syncThemeColor() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const color = getComputedStyle(document.documentElement).getPropertyValue("--surface-card").trim();
  if (meta && color) meta.content = color;
}

function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  localStorage.setItem("theme", next);
  listeners.forEach((listener) => listener());
}

/** `onPage` gives it the white, lifted look it needs on the gray page (web top bar). */
export function ThemeToggle({ onPage = false }: { onPage?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(syncThemeColor, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-pressed={theme === "light"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-full text-ns-ink-muted transition-colors hover:text-ns-ink",
        onPage ? "h-10 w-10 bg-ns-card shadow-ns-card" : "h-9 w-9 bg-ns-sunken"
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}</span>
    </button>
  );
}
