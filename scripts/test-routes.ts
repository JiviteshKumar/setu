// End-to-end smoke test of a running Setu site: every page, a sample of course and all city pages, every internal
// link found on them, 404s, headers, data files, and every API with valid and invalid input.
// Works against the full server build and the static GitHub Pages build (detected automatically).
//   npm run test:routes                                      (http://localhost:3000)
//   npm run test:routes -- https://jiviteshkumar.github.io/setu
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const BASE_PATH = new URL(BASE).pathname.replace(/\/$/, ""); // "/setu" on GitHub Pages
const DATA = join(import.meta.dirname, "..", "data");
let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error(`✗ ${msg}`);
};

async function get(path: string, init?: RequestInit) {
  const t = Date.now();
  const res = await fetch(BASE + path, { redirect: "follow", ...init }); // static hosts redirect /about → /about/
  const body = await res.text();
  return { res, body, ms: Date.now() - t };
}
const json = async (path: string, init?: RequestInit) => {
  const { res, body } = await get(path, init);
  let data: unknown = null;
  try {
    data = JSON.parse(body);
  } catch {
    /* not JSON */
  }
  return { status: res.status, data: data as Record<string, unknown> | null, body };
};

// The static build has no server: no /api, no community Q&A.
const STATIC_SITE = (await get("/api/fx")).res.status === 404;
console.log(`target: ${BASE} (${STATIC_SITE ? "static site" : "server"})`);

const PAGES = [
  "/", "/about", "/alerts", "/career", "/cities", "/connect", "/german", "/germany", "/germany/housing", "/germany/letters", "/germany/work", "/jobs",
  "/offline", "/prep", "/prep/mock", "/programmes", "/scholarships", "/tools/costs", "/tools/dmat", "/tools/grade", "/tracker", "/updates",
  ...["equations", "figures", "latin", "subject"].flatMap((t) => [`/prep/train/${t}`, `/prep/timed/${t}`]),
  ...(STATIC_SITE ? [] : ["/connect/ask", "/community/verify"]),
];
const programmes = (JSON.parse(readFileSync(join(DATA, "programmes.json"), "utf-8")) as { programmes: { id: number }[] }).programmes;
const cities = (JSON.parse(readFileSync(join(DATA, "city-guides.json"), "utf-8")) as { cities: { slug: string }[] }).cities;
const sample = [programmes[0], programmes[programmes.length - 1], ...Array.from({ length: 20 }, (_, i) => programmes[Math.floor(((i + 1) * programmes.length) / 21)])];
const DYNAMIC = [...new Set(sample.map((p) => `/programmes/${p.id}`)), ...cities.map((c) => `/cities/${c.slug}`)];

// Text that should never reach a page: rendering bugs.
const BROKEN = /\bNaN\b|\bundefined\b|\[object Object\]|Invalid Date|Internal Server Error|Application error/;
const visibleText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<[^>]+>/g, " ");

const timings: { path: string; ms: number; kb: number }[] = [];
const links = new Map<string, string>(); // link (without base path) → first page it was found on
const stripBase = (href: string) => (BASE_PATH && href.startsWith(`${BASE_PATH}/`) ? href.slice(BASE_PATH.length) : href);
const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

async function page(path: string) {
  const { res, body, ms } = await get(path);
  timings.push({ path, ms, kb: Math.round(body.length / 1024) });
  if (res.status !== 200) return fail(`${path}: HTTP ${res.status}`);
  if (!res.headers.get("content-type")?.includes("text/html")) fail(`${path}: not HTML`);
  if (!/<title>[^<]{3,}<\/title>/.test(body)) fail(`${path}: missing <title>`);
  if (!body.includes("<main")) fail(`${path}: no <main>`);
  const broken = visibleText(body).match(BROKEN);
  if (broken) fail(`${path}: page shows "${broken[0]}"`);
  if (!STATIC_SITE) for (const h of ["x-content-type-options", "x-frame-options", "referrer-policy"]) if (!res.headers.get(h)) fail(`${path}: missing header ${h}`);
  for (const m of body.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = norm(stripBase(m[1]));
    if (!href.startsWith("/_next") && !links.has(href)) links.set(href, path);
  }
}

// ── Pages ──
for (const p of [...PAGES, ...DYNAMIC]) await page(p);
console.log(`pages: ${PAGES.length} static + ${DYNAMIC.length} course/city pages`);

// ── Every internal link found on those pages ──
const checked = new Set([...PAGES, ...DYNAMIC]);
for (const [href, from] of links) {
  if (checked.has(href)) continue;
  checked.add(href);
  const { res } = await get(href);
  if (res.status >= 400) fail(`broken link ${href} (found on ${from}): HTTP ${res.status}`);
}
console.log(`links: ${links.size} unique internal links checked`);

// ── Expected 404s ──
for (const p of ["/programmes/999999999", "/programmes/abc", "/cities/atlantis", "/connect/ask/999999", "/does-not-exist", "/moderate", "/admin", "/prep/train/nope"]) {
  const { res } = await get(p);
  if (res.status !== 404) fail(`${p}: expected 404, got ${res.status}`);
}

// ── Data files ──
{
  const r = await json("/programme-status.json");
  const courses = r.data?.courses as Record<string, { d: unknown[] }> | undefined;
  if (r.status !== 200 || !courses) fail("/programme-status.json: missing");
  else {
    if (Object.keys(courses).length !== programmes.length) fail(`/programme-status.json: ${Object.keys(courses).length} courses, data has ${programmes.length}`);
    if (!Array.isArray(courses[programmes[0].id]?.d)) fail("/programme-status.json: course without deadline list");
  }
}

// ── APIs (server) or their static replacements ──
if (STATIC_SITE) {
  const fx = await json("/fx.json");
  if (fx.status !== 200) fail("/fx.json: missing");
  else if (!fx.data?.error && !(Number(fx.data?.rate) > 50 && Number(fx.data?.rate) < 200)) fail(`/fx.json: implausible rate ${fx.data?.rate}`);
  for (const p of ["/api/jobs", "/api/report", "/connect/ask", "/community/verify"]) if ((await get(p)).res.status !== 404) fail(`${p}: should not exist on the static site`);
} else {
  const r = await json("/api/fx");
  if (r.status === 200) {
    const rate = Number(r.data?.rate);
    if (!(rate > 50 && rate < 200)) fail(`/api/fx: implausible EUR→INR rate ${rate}`);
  } else if (r.status !== 502) fail(`/api/fx: HTTP ${r.status}`);
  else console.warn("! /api/fx: ECB not reachable right now (502 is the designed answer)");

  for (const q of ["?type=werkstudent&field=Informatik&city=Berlin", "?type=minijob", "?type=internship&field=data", "?type=fulltime&city=M%C3%BCnchen", "?page=999&field=%3Cscript%3E"]) {
    const j = await json(`/api/jobs${q}`);
    if (j.status === 200) {
      if (!Array.isArray(j.data?.jobs)) fail(`/api/jobs${q}: no jobs array`);
      for (const job of (j.data?.jobs as { url: string }[]) ?? []) if (!job.url.startsWith("https://www.arbeitsagentur.de/")) fail(`/api/jobs${q}: job link leaves the official board`);
    } else if (j.status === 502) console.warn(`! /api/jobs${q}: job board not reachable right now`);
    else fail(`/api/jobs${q}: HTTP ${j.status}`);
  }

  const post = (body: string) => json("/api/report", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": `198.51.100.${Math.floor(Math.random() * 250)}` }, body });
  if ((await post("not json")).status !== 400) fail("/api/report: invalid JSON accepted");
  if ((await post(JSON.stringify({ message: "short", page: "/" }))).status !== 400) fail("/api/report: too-short message accepted");
  if ((await post(JSON.stringify({ message: "long enough message", page: "https://evil.example" }))).status !== 400) fail("/api/report: external page accepted");
  if ((await post(JSON.stringify({ message: "long enough message", page: "/", sourceUrl: "javascript:alert(1)" }))).status !== 400) fail("/api/report: javascript: source accepted");
  if ((await post(JSON.stringify({ message: "spam spam spam spam", page: "/", website: "x" }))).status !== 200) fail("/api/report: honeypot should look successful");
  if ((await json("/api/report")).status !== 405) fail("/api/report: GET should not be allowed");

  const g = await json("/api/letter-ai");
  if (g.status !== 200 || typeof g.data?.enabled !== "boolean") fail("/api/letter-ai: GET should say whether it is enabled");
  const short = await json("/api/letter-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "too short" }) });
  if (![400, 404].includes(short.status)) fail(`/api/letter-ai: short text gave ${short.status}`);
  const bad = await json("/api/letter-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  if (![400, 404].includes(bad.status)) fail(`/api/letter-ai: invalid JSON gave ${bad.status}`);
}

// ── Installable app ──
{
  const m = await json("/manifest.webmanifest");
  if (m.data?.display !== "standalone" || !(m.data?.icons as unknown[])?.length) fail("manifest: not installable");
  for (const icon of (m.data?.icons as { src: string }[]) ?? []) if ((await get(stripBase(icon.src))).res.status !== 200) fail(`manifest icon missing: ${icon.src}`);
  if (BASE_PATH && !String(m.data?.start_url).startsWith(BASE_PATH)) fail(`manifest: start_url ${m.data?.start_url} is outside ${BASE_PATH}`);
  const sw = await get("/sw.js");
  if (sw.res.status !== 200) fail("/sw.js: missing");
  if (!STATIC_SITE && !sw.res.headers.get("cache-control")?.includes("no-cache")) fail("/sw.js: cacheable");
}

// ── Speed ──
for (const t of timings.filter((t) => t.ms > 3000)) fail(`${t.path}: slow response (${t.ms} ms)`);
const heavy = [...timings].sort((a, b) => b.kb - a.kb).slice(0, 3);
console.log(`heaviest pages: ${heavy.map((t) => `${t.path} ${t.kb} KB`).join(", ")}`);
console.log(`median response: ${[...timings].sort((a, b) => a.ms - b.ms)[Math.floor(timings.length / 2)].ms} ms`);

if (failures) {
  console.error(`✗ ${failures} problem(s)`);
  process.exit(1);
}
console.log("✓ all routes, links, 404s, data files and APIs behave as intended");
