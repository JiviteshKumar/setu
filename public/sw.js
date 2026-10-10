// Setu service worker — lets the installed app open without a connection.
// Pages: network first (always current when online); the last copy is kept only as an offline fallback.
// Build assets (/_next/static, hashed file names) and icons: cache first, they never change.
// Never cached: API calls, sign-in, community and moderation pages (personal or private content).
// Bump VERSION to drop all old caches on the next visit.
const VERSION = "setu-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
// Works at the domain root and under a sub-path (GitHub Pages: /setu/): every path is relative to the scope.
const BASE = new URL(self.registration?.scope ?? self.location.origin + "/").pathname.replace(/\/$/, "");
const PRECACHE = ["/", "/tracker", "/offline", "/icons/icon-192.png"].map((p) => BASE + p);
const NEVER = /^\/(api|admin|moderate|community)(\/|$)|^\/connect\/ask(\/|$)/;
const MAX_PAGES = 60;
const MAX_ASSETS = 250;

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

/**
 * Static hosts redirect /tracker → /tracker/. Safari refuses redirected responses for page loads, so each page is
 * stored as a clean (non-redirected) copy under both addresses.
 */
async function precache() {
  const cache = await caches.open(PAGES);
  for (const url of PRECACHE) {
    const res = await fetch(url);
    if (!res.ok) continue;
    const clean = res.redirected ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res;
    await cache.put(url, clean.clone());
    if (res.redirected && res.url) await cache.put(res.url, clean);
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE + "/")) return;
  const path = url.pathname.slice(BASE.length); // path inside the app
  if (NEVER.test(path)) return;
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  } else if (path.startsWith("/_next/static/") || path.startsWith("/icons/") || path === "/icon.svg") {
    event.respondWith(cacheFirst(req));
  }
  // Everything else (in-app navigation data, live API data) goes straight to the network. Offline, Next.js then
  // falls back to a full page load, which the navigation handler above answers from the cache.
});

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    // Redirected responses can't be replayed for navigations (Safari rejects them), so only cache direct answers.
    if (res.ok && res.type === "basic" && !res.redirected) {
      await cache.put(req, res.clone());
      trim(PAGES, MAX_PAGES);
    }
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match(BASE + "/offline")) || (await cache.match(BASE + "/offline/")) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    trim(ASSETS, MAX_ASSETS);
  }
  return res;
}

/** Keeps a cache small: removes the oldest entries beyond `max` (the precached pages are re-added on install). */
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  const keep = new Set(PRECACHE.map((p) => new URL(p, self.location.origin).href));
  const removable = keys.filter((k) => !keep.has(k.url)); // oldest first
  for (const k of removable.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}
