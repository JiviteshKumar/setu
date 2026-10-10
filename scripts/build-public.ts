// Writes generated files into public/ before every build (npm "prebuild"/"predev", and the static build):
//   manifest.webmanifest   the installable-app manifest, with the site's base path (/setu on GitHub Pages)
//   programme-status.json  current deadlines + recorded DAAD changes of every course, for "My plan"
//   fx.json                (static build only) the ECB EUR→INR reference rate, saved at build time
// They are plain files so that the same build works on a Node server and on a static host. Not committed (.gitignore).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_NAME, APP_TAGLINE } from "../src/lib/site.ts";
import { deadlineTextInfo, type IntakeDeadline } from "../src/lib/intake.ts";

const ROOT = join(import.meta.dirname, "..");
const PUBLIC = join(ROOT, "public");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
const b = (p: string) => `${BASE}${p}`;

// ── Manifest ──
const icon192 = { src: b("/icons/icon-192.png"), sizes: "192x192" };
writeFileSync(
  join(PUBLIC, "manifest.webmanifest"),
  JSON.stringify(
    {
      id: b("/"),
      name: `${APP_NAME} – ${APP_TAGLINE}`,
      short_name: APP_NAME,
      description: "Verified information for Indian students going to Germany for a Master's at a public university.",
      lang: "en-IN",
      start_url: b("/"),
      scope: b("/"),
      display: "standalone",
      // Same night navy as the opening animation, so the phone's launch screen flows straight into it.
      background_color: "#121621",
      theme_color: "#121621",
      categories: ["education"],
      icons: [
        { src: b("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
        { src: b("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
        { src: b("/icons/maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
      // Long-press the app icon for these.
      shortcuts: [
        { name: "My plan", short_name: "My plan", url: b("/tracker/"), icons: [icon192] },
        { name: "Find courses", short_name: "Courses", url: b("/programmes/"), icons: [icon192] },
        { name: "dMAT practice", short_name: "dMAT", url: b("/prep/"), icons: [icon192] },
        { name: "Alerts", short_name: "Alerts", url: b("/alerts/"), icons: [icon192] },
      ],
    },
    null,
    1,
  ),
);

// ── Course status ──
type Programme = { id: number; deadlines: { intake: "winter" | "summer"; from: string | null; until: string | null; text: string }[] };
const { programmes } = JSON.parse(readFileSync(join(ROOT, "data", "programmes.json"), "utf-8")) as { programmes: Programme[] };
const changesFile = join(ROOT, "data", "programme-changes.json");
const changes: Record<string, unknown[]> = existsSync(changesFile) ? JSON.parse(readFileSync(changesFile, "utf-8")).changes : {};
const courses: Record<string, { d: IntakeDeadline[]; c?: unknown[] }> = {};
for (const p of programmes) {
  // Same shape as intakeDeadlines() in src/lib/programmes.ts (which is server-only and can't be imported here).
  const d = p.deadlines.map((x) => {
    const info = deadlineTextInfo(x.text);
    return { intake: x.intake, from: x.from, until: x.until, ...(info.years.length ? { years: info.years } : {}), ...(info.multi ? { multi: true } : {}) };
  });
  courses[p.id] = { d, ...(changes[p.id]?.length ? { c: changes[p.id] } : {}) };
}
writeFileSync(join(PUBLIC, "programme-status.json"), JSON.stringify({ courses }));

// ── Exchange rate (static site only; the server build serves today's rate from /api/fx) ──
if (STATIC_SITE) {
  const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
  let fx: Record<string, unknown>;
  try {
    const xml = await (await fetch(ECB_URL, { signal: AbortSignal.timeout(30_000) })).text();
    const rate = Number(xml.match(/currency='INR' rate='([\d.]+)'/)?.[1]);
    const date = xml.match(/time='(\d{4}-\d{2}-\d{2})'/)?.[1];
    fx = rate && date ? { rate, date, source: ECB_URL } : { error: "INR rate not found in the ECB feed" };
  } catch (e) {
    fx = { error: `ECB not reachable at build time (${(e as Error).message})` };
  }
  writeFileSync(join(PUBLIC, "fx.json"), JSON.stringify(fx));
  console.log(`fx.json: ${fx.rate ? `1 EUR = ₹${fx.rate} (${fx.date})` : fx.error}`);
}
console.log(`public/: manifest (base "${BASE || "/"}"), status of ${programmes.length} courses`);
