// Integrity checks for everything Setu shows: courses, universities, map, city guides, facts, sources, alerts.
//   npm run test:data
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FACTS } from "../src/content/facts.ts";
import { SOURCES } from "../src/content/sources.ts";
import { isEuOnly, type Programme } from "./build-programmes.ts";

const DATA = join(import.meta.dirname, "..", "data");
const read = <T,>(f: string): T => JSON.parse(readFileSync(join(DATA, f), "utf-8"));
const problems: string[] = [];
const fail = (m: string) => problems.push(m);
const notes: string[] = [];

// ── Courses ──
const { programmes } = read<{ programmes: Programme[] }>("programmes.json");
const { institutions } = read<{ institutions: { hrkId: string; isPublic: boolean; name: string }[] }>("institutions.json");
const publicIds = new Set(institutions.filter((i) => i.isPublic).map((i) => i.hrkId));
publicIds.add("x-charite"); // manually verified (scripts/extra-institutions.ts)
const { cities } = read<{ cities: Record<string, { lat: number; lon: number; country: string }> }>("cities.json");

const ids = new Set<number>();
const validMd = (md: string) => {
  const [m, d] = md.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= new Date(2024, m, 0).getDate(); // 2024: leap year, so 29 Feb is allowed
};
const url = (u: string | null) => !u || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(u);
for (const p of programmes) {
  const at = `course ${p.id} (${p.name.slice(0, 40)})`;
  if (ids.has(p.id)) fail(`${at}: duplicate id`);
  ids.add(p.id);
  if (!publicIds.has(p.universityId)) fail(`${at}: university ${p.universityId} is not a public institution in the HRK register`);
  if (!/master|m\.?\s?sc|m\.?\s?a\b|m\.?\s?eng|mba|ll\.?m|m\.?\s?ed|m\.?\s?f\.?a|m\.?\s?mus/i.test(`${p.degree} ${p.name}`)) fail(`${at}: degree "${p.degree}" doesn't look like a Master's`);
  if (!p.city) fail(`${at}: no city`);
  else if (!cities[p.city]) fail(`${at}: city ${p.city} is not on the map`);
  if (!p.languages.length) fail(`${at}: no teaching language`);
  if (!p.intakes.length && p.deadlines.length) fail(`${at}: deadlines but no intake`);
  for (const d of p.deadlines) {
    if (isEuOnly(d.applicants)) fail(`${at}: EU-only deadline shown to Indian applicants`);
    if (d.until && !validMd(d.until)) fail(`${at}: impossible deadline ${d.until}`);
    if (d.from && !validMd(d.from)) fail(`${at}: impossible opening date ${d.from}`);
    if (!p.intakes.includes(d.intake)) notes.push(`${at}: deadline for a ${d.intake} intake that isn't in its intake list`);
  }
  if (!p.source.url.startsWith("https://www2.daad.de/")) fail(`${at}: source is not the DAAD page`);
  if (!url(p.courseWebsite) || !url(p.universityWebsite)) fail(`${at}: malformed website link`);
  if (p.semesterContributionEur != null && (p.semesterContributionEur < 0 || p.semesterContributionEur > 2000)) fail(`${at}: implausible semester fee €${p.semesterContributionEur}`);
  if (p.state === "Baden-Württemberg" && p.tuition.category === "none" && !p.checks.length) fail(`${at}: Baden-Württemberg course shown as tuition-free without a warning`);
  if (/^TUM\b|Technical University of Munich|Technische Universität München/i.test(p.university) && p.tuition.category === "none" && !p.checks.length) fail(`${at}: TUM course shown as tuition-free without a warning`);
}
const abroad = programmes.filter((p) => cities[p.city] && cities[p.city].country !== "de");
for (const p of abroad) if (!p.checks.some((c) => /abroad|outside Germany|not in Germany/i.test(JSON.stringify(c)))) fail(`course ${p.id}: taught outside Germany (${p.city}) but not flagged`);
console.log(`courses: ${programmes.length} checked (${abroad.length} abroad, all flagged)`);

// ── Map ──
for (const [name, c] of Object.entries(cities)) {
  if (!(c.lat >= -90 && c.lat <= 90 && c.lon >= -180 && c.lon <= 180)) fail(`map: ${name} has impossible coordinates`);
  if (c.country === "de" && !(c.lat > 47 && c.lat < 55.2 && c.lon > 5.8 && c.lon < 15.1)) fail(`map: ${name} is marked German but lies outside Germany`);
}

// ── City guides ──
const guides = read<{ cities: { city: string; slug: string; lat: number; lon: number; [k: string]: unknown }[] }>("city-guides.json").cities;
const slugs = new Set<string>();
for (const g of guides) {
  if (slugs.has(g.slug)) fail(`city guide ${g.slug}: duplicate slug`);
  slugs.add(g.slug);
  if (!/^[a-z0-9-]+$/.test(g.slug)) fail(`city guide ${g.slug}: unsafe slug`);
  if (!programmes.some((p) => p.city === g.city)) fail(`city guide ${g.city}: no public-university course there`);
  // Every listed place must be near the city and link to OpenStreetMap.
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as { km?: number; osm?: string; name?: string };
      if (typeof o.km === "number" && (o.km < 0 || o.km > 30)) fail(`city guide ${g.city}: "${o.name}" is ${o.km} km away`);
      if (o.osm && !o.osm.startsWith("https://www.openstreetmap.org/")) fail(`city guide ${g.city}: non-OSM link`);
      Object.values(o).forEach(walk);
    }
  };
  walk(g);
}
const withCourses = new Set(programmes.filter((p) => cities[p.city]?.country === "de").map((p) => p.city));
notes.push(`city guides: ${guides.length} of ${withCourses.size} German course cities downloaded so far`);

// ── Facts and sources ──
const today = new Date().toISOString().slice(0, 10);
const factIds = new Set<string>();
for (const f of FACTS) {
  if (factIds.has(f.id)) fail(`fact ${f.id}: duplicate id`);
  factIds.add(f.id);
  if (!f.sources.length) fail(`fact ${f.id}: no source`);
  for (const s of f.sources) if (!SOURCES[s]) fail(`fact ${f.id}: unknown source ${s}`);
  if (!f.anchors.length) fail(`fact ${f.id}: no anchor — it can't be re-checked automatically`);
  for (const a of f.anchors) if (!f.sources.includes(a.source)) fail(`fact ${f.id}: anchor uses a source the fact doesn't cite`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.verifiedOn) || f.verifiedOn > today) fail(`fact ${f.id}: bad verifiedOn ${f.verifiedOn}`);
}
for (const [k, s] of Object.entries(SOURCES)) if (!s.url.startsWith("https://")) fail(`source ${k}: not https`);

// ── Alerts ──
if (existsSync(join(DATA, "alerts.json"))) {
  const { alerts } = read<{
    alerts: { id: string; title: string; summary: string; sources: { url: string }[]; publishedAt: string; kind: string; quotes?: { added: string[]; removed: string[] } }[];
  }>("alerts.json");
  const officialUrls = new Set(Object.values(SOURCES).map((s) => s.url));
  const alertIds = new Set<string>();
  for (const a of alerts) {
    if (alertIds.has(a.id)) fail(`alert ${a.id}: duplicate id`);
    alertIds.add(a.id);
    if (!a.sources?.length) fail(`alert ${a.id}: no source`);
    if (!a.title || !a.summary) fail(`alert ${a.id}: empty text`);
    if (Number.isNaN(Date.parse(a.publishedAt))) fail(`alert ${a.id}: bad date`);
    // Published without a person: must point to a watched official source and quote only short lines.
    if (a.kind === "detected") {
      if (!a.sources.every((s) => officialUrls.has(s.url))) fail(`alert ${a.id}: automatic alert cites a page that isn't an official source`);
      if (!a.quotes || [...a.quotes.added, ...a.quotes.removed].some((q) => !q || q.length > 320)) fail(`alert ${a.id}: bad quotes`);
    }
  }
  console.log(`alerts: ${alerts.length} published`);
}

// ── University course pages (weekly reading, for My plan) ──
if (existsSync(join(DATA, "uni-pages.json"))) {
  const { pages } = read<{ pages: Record<string, { url: string; status: string; snippets: string[]; dates: string[] }> }>("uni-pages.json");
  const byId = new Map(programmes.map((p) => [String(p.id), p]));
  for (const [id, pg] of Object.entries(pages)) {
    if (!byId.has(id)) fail(`uni page ${id}: no such course`);
    else if (byId.get(id)!.courseWebsite !== pg.url) notes.push(`uni page ${id}: course link changed since the last reading (re-read next week)`);
    if (!["ok", "unreadable", "blocked", "error"].includes(pg.status)) fail(`uni page ${id}: unknown status ${pg.status}`);
    if (pg.snippets.length > 6 || pg.snippets.some((s) => s.length > 420)) fail(`uni page ${id}: too much quoted text`);
    if (pg.dates.some((d) => !validMd(d))) fail(`uni page ${id}: impossible date`);
  }
  console.log(`university pages: ${Object.keys(pages).length} read`);
}

for (const n of notes.slice(0, 8)) console.log(`· ${n}`);
if (notes.length > 8) console.log(`· … ${notes.length - 8} more notes`);
if (problems.length) {
  for (const p of problems.slice(0, 40)) console.error(`✗ ${p}`);
  console.error(`✗ ${problems.length} data problem(s)`);
  process.exit(1);
}
console.log(`✓ data: ${programmes.length} courses, ${Object.keys(cities).length} map cities, ${guides.length} city guides, ${FACTS.length} facts, ${Object.keys(SOURCES).length} sources`);
