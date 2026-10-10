// Tests public/sw.js (the installed app's offline support) in a simulated service-worker environment:
// fake Cache Storage and a network that can be switched off.   npm run test:sw
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const ORIGIN = "https://setu.example";
let failures = 0;
const check = (label: string, ok: boolean) => {
  if (!ok) {
    failures++;
    console.error(`✗ ${label}`);
  }
};

// ── Fake Cache Storage ──
class FakeCache {
  store = new Map<string, Response>();
  key = (r: string | { url: string }) => new URL(typeof r === "string" ? r : r.url, ORIGIN).href;
  async match(r: string | { url: string }) {
    const hit = this.store.get(this.key(r));
    return hit ? hit.clone() : undefined;
  }
  async put(r: { url: string }, res: Response) {
    this.store.set(this.key(r), res);
  }
  async addAll(urls: string[]) {
    for (const u of urls) {
      const res = await network(new Request(new URL(u, ORIGIN)));
      this.store.set(this.key(u), res);
    }
  }
  async keys() {
    return [...this.store.keys()].map((url) => ({ url }));
  }
  async delete(r: { url: string }) {
    return this.store.delete(this.key(r));
  }
}
const cacheMap = new Map<string, FakeCache>();
const caches = {
  open: async (n: string) => cacheMap.get(n) ?? (cacheMap.set(n, new FakeCache()), cacheMap.get(n)!),
  keys: async () => [...cacheMap.keys()],
  delete: async (n: string) => cacheMap.delete(n),
};

// ── Fake network ──
let online = true;
let fetches = 0;
const redirects = new Set<string>();
function network(req: Request | string): Promise<Response> {
  fetches++;
  if (!online) return Promise.reject(new TypeError("Failed to fetch"));
  const path = new URL(typeof req === "string" ? req : req.url, ORIGIN).pathname;
  const res = new Response(`page ${path} v${fetches}`, { status: 200, headers: { "content-type": "text/html" } });
  Object.defineProperty(res, "type", { value: "basic" });
  Object.defineProperty(res, "redirected", { value: redirects.has(path) });
  if (redirects.has(path)) Object.defineProperty(res, "url", { value: ORIGIN + path + "/" }); // like a static host adding the trailing slash
  return Promise.resolve(res);
}

// ── Load sw.js ──
const handlers: Record<string, (e: unknown) => void> = {};
const self = { location: { origin: ORIGIN }, addEventListener: (t: string, h: (e: unknown) => void) => (handlers[t] = h), skipWaiting: async () => {}, clients: { claim: async () => {} } };
vm.runInNewContext(readFileSync(join(import.meta.dirname, "..", "public", "sw.js"), "utf-8"), { self, caches, fetch: network, URL, Response, Request, Promise, Set, Math, console });

async function lifecycle(type: "install" | "activate") {
  let p: Promise<unknown> = Promise.resolve();
  handlers[type]({ waitUntil: (x: Promise<unknown>) => (p = x) });
  await p;
}
/** Dispatches a fetch event; returns the response text, or null when the worker leaves the request to the browser. */
async function request(path: string, mode: "navigate" | "cors" | "no-cors" = "navigate", method = "GET") {
  let responded: Promise<Response> | null = null;
  handlers.fetch({ request: { url: ORIGIN + path, method, mode }, respondWith: (r: Promise<Response>) => (responded = r) });
  if (!responded) return null;
  try {
    const res = await (responded as Promise<Response>);
    return res.type === "error" ? "ERROR" : await res.text();
  } catch {
    return "ERROR";
  }
}

// ── Tests ──
cacheMap.set("setu-v0-pages", new FakeCache()); // a cache from an older version
await lifecycle("install");
const pages = cacheMap.get("setu-v1-pages")!;
check("install precaches home, plan, offline page and icon", ["/", "/tracker", "/offline", "/icons/icon-192.png"].every((p) => pages.store.has(ORIGIN + p)));
await lifecycle("activate");
check("activate deletes caches of older versions", !cacheMap.has("setu-v0-pages"));

const first = await request("/programmes/4722");
check("online: a page comes from the network", first?.startsWith("page /programmes/4722") ?? false);
check("online: the page is kept for offline use", pages.store.has(ORIGIN + "/programmes/4722"));

online = false;
check("offline: a page read before is served from the cache", (await request("/programmes/4722")) === first);
check("offline: an unread page shows the offline page", (await request("/cities/aachen"))?.startsWith("page /offline") ?? false);
online = true;

const fresh = await request("/programmes/4722");
check("online again: the network wins over the old copy", fresh !== first && (fresh?.startsWith("page /programmes/4722") ?? false));

check("API calls are left to the network", (await request("/api/fx", "cors")) === null);
check("sign-in / community pages are never cached", (await request("/connect/ask", "navigate")) === null && (await request("/community/verify?token=x")) === null);
check("moderation is never cached", (await request("/moderate")) === null);
check("in-app navigation data (RSC) goes to the network", (await request("/programmes?_rsc=abc", "cors")) === null);
check("POST requests are untouched", (await request("/connect/ask", "navigate", "POST")) === null);

const asset = await request("/_next/static/chunks/app.js", "no-cors");
online = false;
check("build assets are served from the cache offline", (await request("/_next/static/chunks/app.js", "no-cors")) === asset);
online = true;

redirects.add("/old-link");
await request("/old-link");
check("redirected answers are not cached (Safari rejects them offline)", !pages.store.has(ORIGIN + "/old-link"));

for (let i = 0; i < 80; i++) await request(`/programmes/${1000 + i}`);
await new Promise((r) => setTimeout(r, 20)); // let trim() finish
check(`page cache is capped at 60 (has ${pages.store.size})`, pages.store.size <= 60);
check("precached pages survive trimming", pages.store.has(ORIGIN + "/offline") && pages.store.has(ORIGIN + "/"));

// ── Under a sub-path, like GitHub Pages (https://<user>.github.io/setu/), where /tracker redirects to /tracker/ ──
{
  cacheMap.clear();
  redirects.clear();
  for (const p of ["/setu/tracker", "/setu/offline"]) redirects.add(p);
  online = true;
  const sub: Record<string, (e: unknown) => void> = {};
  const subSelf = { ...self, registration: { scope: ORIGIN + "/setu/" }, addEventListener: (t: string, h: (e: unknown) => void) => (sub[t] = h) };
  vm.runInNewContext(readFileSync(join(import.meta.dirname, "..", "public", "sw.js"), "utf-8"), { self: subSelf, caches, fetch: network, URL, Response, Request, Promise, Set, Math, console });
  let p: Promise<unknown> = Promise.resolve();
  sub.install({ waitUntil: (x: Promise<unknown>) => (p = x) });
  await p;
  const c = cacheMap.get("setu-v1-pages")!;
  check("sub-path: precached under /setu/ (both /tracker and /tracker/)", ["/setu/", "/setu/tracker", "/setu/tracker/", "/setu/offline/"].every((x) => c.store.has(ORIGIN + x)));
  const stored = c.store.get(ORIGIN + "/setu/tracker/");
  check("sub-path: stored copies are not marked as redirected", stored !== undefined && !stored.redirected);
  const ask = (path: string, mode = "navigate") => {
    let r = null as Promise<Response> | null;
    sub.fetch({ request: { url: ORIGIN + path, method: "GET", mode }, respondWith: (x: Promise<Response>) => (r = x) });
    return r as Promise<Response> | null;
  };
  check("sub-path: pages outside /setu/ are left alone", ask("/other-site/") === null);
  check("sub-path: community pages never cached", ask("/setu/connect/ask/") === null);
  online = false;
  const offline = await ask("/setu/cities/aachen/")!;
  check("sub-path: offline page served under /setu/", (await offline.text()).startsWith("page /setu/offline"));
}

if (failures) {
  console.error(`✗ ${failures} service-worker test(s) failed`);
  process.exit(1);
}
console.log("✓ service worker: offline fallback, caching rules and limits behave as intended");
