// Turns the raw DAAD pages + HRK institution list into data/programmes.json.
// Only programmes that can be matched with certainty to a PUBLIC (öffentlich-rechtlich)
// institution are published. Anything uncertain goes to data/qa-report.json for a human.
import { readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { RAW, OUT, readJson, writeJson, htmlToText, decodeEntities, registrableDomain, normalizeName } from "./lib.ts";
import type { Institution } from "./fetch-institutions.ts";
import type { ListingEntry } from "./fetch-programmes.ts";
import { EXTRA_INSTITUTIONS } from "./extra-institutions.ts";

const DAAD_BASE = "https://www2.daad.de/deutschland/studienangebote/international-programmes";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

type Deadline = { intake: "winter" | "summer"; applicants: string; from: string | null; until: string | null; text: string };

export type Programme = {
  id: number;
  name: string;
  degree: string;
  subject: string;
  university: string; // name as shown by DAAD
  universityId: string; // HRK id
  universityOfficialName: string;
  universityType: string;
  state: string;
  city: string;
  languages: string[];
  languageNote: string | null;
  mode: string | null; // full-time / part-time
  duration: string | null;
  durationSemesters: number | null;
  intakes: ("winter" | "summer")[];
  deadlines: Deadline[];
  deadlinesText: string | null;
  applyVia: "uni-assist" | "university" | "unknown";
  applyViaText: string | null;
  tuition: { category: "none" | "charged" | "unclear"; text: string | null };
  semesterContribution: string | null;
  semesterContributionEur: number | null;
  costOfLiving: string | null;
  admissionRequirements: string | null;
  germanRequirement: string | null;
  englishRequirement: string | null;
  mentionsGre: boolean;
  mentionsVpd: boolean;
  partTimeWork: string | null;
  accommodation: string | null;
  description: string | null;
  courseWebsite: string | null;
  universityWebsite: string | null;
  source: { name: string; url: string; fetchedAt: string };
  publicStatusSource: { name: string; url: string };
  checks: string[]; // automated warnings shown to users as "please double-check"
  support: string[]; // DAAD's list, e.g. "Buddy programme", "Welcome event", "Pick-up service"
};

type QaIssue = { id: number; programme: string; university: string; issue: string };

/** The "Support for international students" list on a DAAD programme page (fixed DAAD vocabulary). */
function parseSupport(html: string): string[] {
  const m = html.match(/<dt[^>]*>\s*Support for international students and doctoral candidates\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/);
  if (!m) return [];
  return [
    ...new Set(
      m[1]
        .replace(/<li[^>]*>/g, "|")
        .replace(/<[^>]+>/g, " ")
        .split("|")
        .map((s) => decodeEntities(s).replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ),
  ];
}

function parseFields(html: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const m of html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)) {
    const key = htmlToText(m[1]).replace(/\s+/g, " ").trim();
    const value = htmlToText(m[2]).trim();
    if (key && !fields.has(key)) fields.set(key, value);
  }
  return fields;
}

const flat = (s: string | undefined | null) => (s ? s.replace(/\s+/g, " ").replace(/^•\s*/, "").trim() || null : null);

function dayMonth(s: string): string[] {
  const re = new RegExp(`\\b(\\d{1,2})\\.?\\s+(${MONTHS.join("|")})\\b`, "gi");
  return [...s.matchAll(re)].map((m) => `${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`);
}

/** Websites without a scheme ("www.uni.de") would become broken relative links on our pages; non-web values are dropped. */
function webUrl(u: string | null): string | null {
  const v = u?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\.|^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v)) return `https://${v}`;
  return null;
}

/** True for applicant groups that exclude Indian applicants (EU/EEA/German only, without "non-EU" or "all countries"). */
export function isEuOnly(applicants: string): boolean {
  // Only a plain list of country groups counts; sentences with dates or colons describe something else
  // (e.g. "… with a degree earned outside Germany: 31 March" applies to Indian applicants).
  if (/\d|:/.test(applicants)) return false;
  return /\bEU\b|\bGerman(y)?\b/i.test(applicants) && !/non-EU|all countries/i.test(applicants);
}

/** Pull deadlines relevant to an Indian (non-EU) applicant. Returns [] when the text is not machine-readable. */
function parseDeadlines(text: string | null): Deadline[] {
  if (!text) return [];
  const segments = text.split(/The following is valid for applicants from:/i).map((s) => s.trim()).filter(Boolean);
  const out: Deadline[] = [];
  for (const seg of segments) {
    const groupMatch = seg.match(/^(.*?)\s+For the (winter|summer) semester/i);
    const applicants = groupMatch ? groupMatch[1].trim() : "all countries";
    // Skip sections that are only for EU / German applicants. DAAD often writes the group as a bullet list
    // ("• EU countries • Iceland • Norway …"), so look for the words anywhere, not just at the start.
    if (isEuOnly(applicants)) continue;
    for (const part of seg.matchAll(/For the (winter|summer) semester:\s*([\s\S]*?)(?=For the (?:winter|summer) semester:|$)/gi)) {
      const intake = part[1].toLowerCase() as "winter" | "summer";
      const body = part[2].trim();
      const dates = dayMonth(body);
      if (!dates.length) continue;
      const isRange = /\bfrom\b|–|-|\bto\b/i.test(body) && dates.length >= 2;
      out.push({ intake, applicants, from: isRange ? dates[0] : null, until: dates[dates.length - 1], text: body });
    }
  }
  return out;
}

function classifyTuition(text: string | null): Programme["tuition"]["category"] {
  if (!text) return "unclear";
  const t = text.trim().toLowerCase();
  if (t === "none" || t === "no tuition fees" || t === "no tuition fees." || t === "none.") return "none";
  if (/\d/.test(t) && /(eur|€|euro)/i.test(t)) return "charged";
  return "unclear";
}

function firstEuroAmount(text: string | null): number | null {
  if (!text) return null;
  const m = text.match(/(\d{2,4}(?:[.,]\d{1,2})?)\s*(?:EUR|€|euros?)/i) ?? text.match(/(?:EUR|€)\s*(\d{2,4}(?:[.,]\d{1,2})?)/i);
  if (!m) return null;
  const v = Number(m[1].replace(",", "."));
  return v >= 50 && v <= 1000 ? v : null; // outside this range it's probably not a semester contribution
}

function main() {
  const hrk = readJson<{ institutions: Institution[] }>(join(OUT, "institutions.json")).institutions;
  const institutions: Institution[] = [...hrk, ...EXTRA_INSTITUTIONS];
  const listing = readJson<{ entries: ListingEntry[] }>(join(RAW, "daad_listing.json")).entries;

  const byDomain = new Map<string, Institution[]>();
  for (const inst of institutions) {
    if (!inst.domain) continue;
    byDomain.set(inst.domain, [...(byDomain.get(inst.domain) ?? []), inst]);
  }
  const byName = new Map<string, Institution>();
  for (const inst of institutions) {
    for (const n of [inst.name, inst.displayName]) byName.set(normalizeName(n), inst);
  }
  const overridesPath = join(OUT, "institution-overrides.json");
  // Manually verified mappings "DAAD academy name" -> HRK id, for names/domains that don't match automatically.
  const overrides: Record<string, string> = existsSync(overridesPath) ? readJson(overridesPath) : {};

  // City coordinates from `npm run data:map` (optional — without it the location check is skipped).
  const citiesPath = join(OUT, "cities.json");
  type Geo = { lon: number; lat: number; country?: string } | null;
  const cityCoords: Record<string, Geo> = existsSync(citiesPath) ? readJson<{ cities: Record<string, Geo> }>(citiesPath).cities : {};

  const programmes: Programme[] = [];
  const qa: QaIssue[] = [];
  const skippedNonPublic = new Map<string, number>();

  for (const entry of listing) {
    const file = join(RAW, "daad", `${entry.id}.html`);
    if (!existsSync(file)) {
      qa.push({ id: entry.id, programme: entry.courseName, university: entry.academy, issue: "detail page not downloaded" });
      continue;
    }
    const html = readFileSync(file, "utf-8");
    const f = parseFields(html);
    const get = (k: string) => flat(f.get(k));

    // --- Match the institution, most reliable signal first.
    const uniHref = html.match(/<a class="c-contact__link" href="([^"]+)"/)?.[1] ?? null;
    const courseHref = html.match(/href="([^"]+)"[^>]*visitCourseWebsite/)?.[1] ?? null;
    let inst: Institution | undefined;
    let how = "";
    if (overrides[entry.academy]) {
      inst = institutions.find((i) => i.hrkId === overrides[entry.academy]);
      how = "override";
    }
    for (const [label, href] of [["university link", uniHref], ["course website", courseHref]] as const) {
      if (inst || !href) continue;
      const d = registrableDomain(decodeEntities(href));
      const candidates = d ? byDomain.get(d) : undefined;
      if (candidates?.length === 1) {
        inst = candidates[0];
        how = label;
      }
    }
    if (!inst) {
      const n = byName.get(normalizeName(entry.academy));
      if (n) {
        inst = n;
        how = "exact name";
      }
    }
    if (!inst) {
      qa.push({ id: entry.id, programme: entry.courseName, university: entry.academy, issue: `could not match institution (link: ${uniHref ?? "-"})` });
      continue;
    }
    if (!inst.isPublic) {
      skippedNonPublic.set(`${entry.academy} [${inst.sponsorship}]`, (skippedNonPublic.get(`${entry.academy} [${inst.sponsorship}]`) ?? 0) + 1);
      continue;
    }
    // Sanity check: DAAD city should match the HRK city for the main campus, or the name should overlap.
    // A mismatch is not an error (branch campuses exist) but is recorded for review when matched by domain only.
    const cityOk = normalizeName(inst.city).includes(normalizeName(entry.city)) || normalizeName(entry.city).includes(normalizeName(inst.city));
    if (!cityOk && how !== "override") {
      qa.push({ id: entry.id, programme: entry.courseName, university: entry.academy, issue: `matched to ${inst.name} (${inst.city}) via ${how}, but DAAD city is ${entry.city} — branch campus?` });
    }

    const tuitionText = get("Tuition fees per semester");
    const deadlinesText = get("Application periods");
    const admission = f.get("Academic admission requirements") ?? null;
    const applyText = get("Submit application via");
    const checks: string[] = [];
    const tuitionCategory = classifyTuition(tuitionText);

    // Cross-checks against rules we know from official sources (see src/content/facts.ts).
    if (inst.state === "Baden-Württemberg" && tuitionCategory === "none") {
      checks.push("Baden-Württemberg public universities generally charge non-EU students €1,500 per semester. DAAD lists no tuition here — confirm on the university website.");
    }
    if (inst.shortName.startsWith("München TU") && tuitionCategory === "none") {
      checks.push("TU Munich charges tuition to non-EU students who started from winter 2024/25. Confirm the fee on the TUM website.");
    }
    // Courses taught outside Germany: decided from the city's geocoded position (data/cities.json), not from its name.
    // (country of the geocoded settlement; the coordinate box is only a fallback for old cache files)
    const ll = cityCoords[entry.city];
    if (ll && (ll.country ? ll.country !== "de" : !(ll.lon > 5.8 && ll.lon < 15.1 && ll.lat > 47.2 && ll.lat < 55.1))) {
      checks.push(`This course appears to be taught in ${entry.city}, not in Germany. Check the location on the course website.`);
    }
    const deadlines = parseDeadlines(deadlinesText);
    if (deadlinesText && !deadlines.length && !/no deadline/i.test(deadlinesText)) {
      checks.push("The deadline is written as free text with conditions, so we don't convert it into a date. Read the original wording carefully and confirm on the course website.");
    }

    const sem = get("Programme duration")?.match(/(\d+)\s*semester/i);
    const beginning = (get("Beginning") ?? entry.beginning ?? "").toLowerCase();
    const intakes: ("winter" | "summer")[] = [];
    if (beginning.includes("winter")) intakes.push("winter");
    if (beginning.includes("summer")) intakes.push("summer");
    // Some entries give a start such as "variable" but list a deadline "for the winter semester": use that intake,
    // otherwise the intake filter would hide a course that clearly has one.
    if (!intakes.length) for (const d of deadlines) if (!intakes.includes(d.intake)) intakes.push(d.intake);

    programmes.push({
      id: entry.id,
      name: decodeEntities(entry.courseName),
      degree: get("Degree") ?? "Master",
      subject: entry.subject,
      university: decodeEntities(entry.academy),
      universityId: inst.hrkId,
      universityOfficialName: inst.name,
      universityType: inst.type,
      state: inst.state,
      city: entry.city,
      languages: entry.languages,
      languageNote: get("Languages"),
      mode: get("Full-time / part-time"),
      duration: get("Programme duration"),
      durationSemesters: sem ? Number(sem[1]) : null,
      intakes,
      deadlines,
      deadlinesText,
      applyVia: applyText ? (/uni-assist/i.test(applyText) ? "uni-assist" : "university") : "unknown",
      applyViaText: applyText,
      tuition: { category: tuitionCategory, text: tuitionText },
      semesterContribution: get("Semester contribution"),
      semesterContributionEur: firstEuroAmount(get("Semester contribution")),
      costOfLiving: get("Costs of living"),
      admissionRequirements: admission,
      germanRequirement: get("German language skills"),
      englishRequirement: get("English language skills"),
      mentionsGre: /\bGRE\b/.test(admission ?? ""),
      mentionsVpd: /\bVPD\b/.test(`${admission ?? ""} ${applyText ?? ""}`),
      partTimeWork: f.get("Possibility of finding part-time employment") ?? null,
      accommodation: f.get("Accommodation") ?? null,
      description: f.get("Description/content") ?? null,
      courseWebsite: webUrl(courseHref ? decodeEntities(courseHref) : null),
      universityWebsite: webUrl(uniHref ? decodeEntities(uniHref) : inst.homepage),
      source: { name: "DAAD International Programmes", url: `${DAAD_BASE}/en/detail/${entry.id}/`, fetchedAt: statSync(file).mtime.toISOString() },
      publicStatusSource: (() => {
        const extra = EXTRA_INSTITUTIONS.find((x) => x.hrkId === inst.hrkId);
        return extra
          ? { name: "Official source on its public status", url: extra.source }
          : { name: "Hochschulkompass (HRK)", url: "https://www.hochschulkompass.de/hochschulen/downloads.html" };
      })(),
      checks,
      support: parseSupport(html),
    });
  }

  programmes.sort((a, b) => a.name.localeCompare(b.name));
  recordChanges(programmes);
  writeJson(join(OUT, "programmes.json"), { builtAt: new Date().toISOString(), count: programmes.length, programmes });
  writeJson(join(OUT, "qa-report.json"), {
    builtAt: new Date().toISOString(),
    unmatchedOrFlagged: qa,
    skippedNonPublic: Object.fromEntries([...skippedNonPublic].sort((a, b) => b[1] - a[1])),
    programmesWithChecks: programmes.filter((p) => p.checks.length).map((p) => ({ id: p.id, name: p.name, university: p.university, checks: p.checks })),
  });
  const total = listing.length;
  const skipped = [...skippedNonPublic.values()].reduce((a, b) => a + b, 0);
  console.log(`listing ${total} → published ${programmes.length} public programmes, skipped ${skipped} non-public, ${qa.length} QA issues`);
}

// Fields students act on. When DAAD changes one of them, saved courses in the tracker show the change.
const WATCHED_FIELDS: { label: string; get: (p: Programme) => string | null }[] = [
  { label: "Application deadline", get: (p) => p.deadlinesText },
  { label: "Tuition fee", get: (p) => p.tuition.text },
  { label: "Semester contribution", get: (p) => p.semesterContribution },
  { label: "English requirement", get: (p) => p.englishRequirement },
  { label: "German requirement", get: (p) => p.germanRequirement },
  { label: "Admission requirements", get: (p) => p.admissionRequirements },
  { label: "How to apply", get: (p) => p.applyViaText },
  { label: "Intakes", get: (p) => p.intakes.join(", ") || null },
];

export type ProgrammeChange = { field: string; before: string | null; after: string | null; detectedAt: string };

/** Compares the new build with the previous programmes.json and appends differences to data/programme-changes.json (kept 180 days). */
function recordChanges(next: Programme[]) {
  const prevPath = join(OUT, "programmes.json");
  const changesPath = join(OUT, "programme-changes.json");
  if (!existsSync(prevPath)) return;
  const prev = readJson<{ programmes: Programme[] }>(prevPath).programmes;
  const store: { changes: Record<string, ProgrammeChange[]> } = existsSync(changesPath) ? readJson(changesPath) : { changes: {} };
  const now = new Date().toISOString();
  const nextById = new Map(next.map((p) => [p.id, p]));
  let count = 0;
  const add = (id: number, c: ProgrammeChange) => {
    (store.changes[id] ??= []).push(c);
    count++;
  };
  // A sudden large drop means a crawl problem, not hundreds of cancelled courses — don't report removals then.
  const trustRemovals = next.length >= prev.length * 0.95;
  if (!trustRemovals) console.warn(`! ${prev.length - next.length} programmes missing compared to last build — removals NOT recorded; check the crawl`);
  for (const old of prev) {
    const cur = nextById.get(old.id);
    if (!cur) {
      if (!trustRemovals) continue;
      add(old.id, { field: "Listing", before: "Listed in the DAAD database", after: "No longer listed — check the university website", detectedAt: now });
      continue;
    }
    for (const f of WATCHED_FIELDS) {
      const a = f.get(old);
      const b = f.get(cur);
      if ((a ?? "") !== (b ?? "")) add(old.id, { field: f.label, before: a, after: b, detectedAt: now });
    }
  }
  const cutoff = Date.now() - 180 * 86_400_000;
  for (const id of Object.keys(store.changes)) {
    store.changes[id] = store.changes[id].filter((c) => Date.parse(c.detectedAt) > cutoff);
    if (!store.changes[id].length) delete store.changes[id];
  }
  writeJson(changesPath, store);
  console.log(`${count} field changes recorded since the previous build`);
}

// Only build when run directly (npm run data:build), not when another script imports a helper from this file.
if (import.meta.filename === process.argv[1] || process.argv[1]?.endsWith("build-programmes.ts")) main();
