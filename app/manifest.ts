import type { MetadataRoute } from "next";
import { token } from "@/lib/server/tokens";

/** Makes the site installable: "Add to Home Screen" opens it full-screen with its own icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Stock Tracker",
    short_name: "Stocks",
    description: "Your swing-trading book: positions, live P&L, watchlist and journal, stored on this device.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    // The splash screen matches the page; the system bar matches the white app header.
    background_color: token("surface-page"),
    theme_color: token("surface-card"),
    categories: ["finance", "productivity"],
    icons: [
      { src: "/app-icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
