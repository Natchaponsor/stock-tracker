/**
 * The service worker, served at /sw.js so its scope is the whole app.
 *
 * Built once per deploy with that deploy's commit stamped in, so every deploy
 * ships a byte-different worker: the browser notices, installs it alongside the
 * old one, and the page offers "A new version is available · Reload".
 *
 * Caching, by request:
 * - /_next/static/*, /app-icons/*: cache first (file names change when content does).
 * - Pages and client-navigation data: network first, cached copy when offline.
 * - /api/quote: network first; offline it falls back to the last prices, which
 *   still carry their own "as of" time, so the page stays honest about their age.
 * - /api/logo: cache first (logos rarely change).
 * - Everything else under /api: network only.
 *
 * Push: FX rate alerts (opt-in, app/api/cron/fx-alerts) arrive as a push with
 * { title, body, pair }; tapping the notification opens that pair's page.
 */
export const dynamic = "force-static";

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? `local-${Date.now()}`;

// Pages fetched at install, so the app opens offline even on routes not visited yet.
const SHELL = ["/", "/strategies", "/analysis", "/fx", "/disclosures", "/positions/new"];

const script = `
const VERSION = ${JSON.stringify(VERSION)};
const STATIC_CACHE = "static-" + VERSION;
const PAGE_CACHE = "pages-" + VERSION;
const DATA_CACHE = "data";
const SHELL = ${JSON.stringify(SHELL)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) =>
      Promise.allSettled(SHELL.map((url) => fetch(url).then((res) => res.ok && cache.put(url, res))))
    )
  );
  // No skipWaiting here: an update waits until the user taps Reload.
});

self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, PAGE_CACHE, DATA_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { title: "FX alert", body: event.data ? event.data.text() : "" };
  }
  const pair = typeof data.pair === "string" ? data.pair : null;
  const url = pair ? "/fx/" + pair.replace("/", "-").toLowerCase() : "/fx";
  event.waitUntil(
    self.registration.showNotification(data.title || "FX alert", {
      body: data.body || "",
      tag: data.alertId ? "fx-" + data.alertId : undefined,
      icon: "/app-icons/icon-192.png",
      badge: "/app-icons/icon-192.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/fx";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await caches.match(request)) || (fallbackUrl && (await caches.match(fallbackUrl)));
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;

  if (path.startsWith("/_next/static/") || path.startsWith("/app-icons/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (path.startsWith("/api/quote")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
  } else if (path.startsWith("/api/logo")) {
    event.respondWith(cacheFirst(request, DATA_CACHE));
  } else if (path.startsWith("/api/")) {
    return;
  } else if (request.mode === "navigate") {
    // An uncached page offline falls back to the dashboard rather than an error.
    event.respondWith(networkFirst(request, PAGE_CACHE, "/"));
  } else {
    event.respondWith(networkFirst(request, PAGE_CACHE));
  }
});
`;

export function GET() {
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Always check for a new worker; the browser compares bytes to spot an update.
      "Cache-Control": "no-cache",
    },
  });
}
