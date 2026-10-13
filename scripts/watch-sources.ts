// Watches every official source for changes and queues them for human review.
//
//   npm run alerts:watch            # check all sources, queue changes (AI drafts if Ollama is running)
//   npm run alerts:watch -- --no-ai # skip AI drafts
//   npm run alerts:watch -- --no-ai --publish     # the daily cloud run (pages.yml): publish confirmed changes itself
//   npm run alerts:watch -- --rebaseline          # only re-take the snapshots (e.g. after moving to another network)
//
// First run per source only stores a baseline snapshot. Later runs compare against it:
//   data/watch/snapshots/<source>.txt   last seen text of each page
//   data/watch/pending/<id>.json        changes waiting for review in /admin (dev only)
// Without --publish nothing is published — a person approves each alert in /admin. With --publish, changes that are
// still there on the next day's check are published as word-for-word quotes (scripts/auto-alerts.ts).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FACTS } from "../src/content/facts.ts";
import { SOURCES, type SourceKey } from "../src/content/sources.ts";
import { OUT, ensureDir, fetchPageText, writeJson } from "./lib.ts";
import { draftAlert, guardDraft, ollamaAvailable, OLLAMA_MODEL, type Draft, type GuardResult } from "./ai-draft.ts";
import { confirmAndPublish, type Detected } from "./auto-alerts.ts";

export const WATCH_DIR = join(OUT, "watch");
const SNAP_DIR = join(WATCH_DIR, "snapshots");
const PENDING_DIR = join(WATCH_DIR, "pending");

export type ChangeCandidate = {
  id: string;
  sourceKey: SourceKey;
  sourceName: string;
  url: string;
  detectedAt: string;
  added: string[];
  removed: string[];
  relevance: number;
  keywords: string[];
  affectedFacts: { id: string; title: string; brokenAnchors: string[] }[];
  ai: { model: string; draft: Draft; guard: GuardResult } | { error: string } | null;
};

// Words that make a change likely to matter for Indian Master's students (English + German).
const KEYWORDS = [
  "india", "indian", "aps", "dmat", "visa", "visum", "blocked account", "sperrkonto", "deadline", "frist", "fee", "gebühr", "euro", "eur",
  "tuition", "studiengebühr", "master", "application", "bewerbung", "admission", "zulassung", "registration", "anmeldung", "certificate",
  "zertifikat", "test", "appointment", "termin", "portal", "residence", "aufenthalt", "work", "arbeitstage", "stunden", "semester",
  "summer semester", "winter semester", "2026", "2027", "2028", "new", "neu", "change", "änderung", "abolished", "abgeschafft",
];

// Lines that change all the time without meaning anything.
const NOISE = [/^©/, /cookie/i, /^\d{1,2}\.\d{1,2}\.\d{4}$/, /^(menu|menü|search|suche|login|share|teilen)$/i, /javascript/i];

function normaliseLines(lines: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const l = raw.replace(/\s+/g, " ").replace(/^•\s*/, "").trim();
    if (l.length < 25 || NOISE.some((r) => r.test(l)) || seen.has(l)) continue;
    seen.add(l);
    out.push(l);
  }
  return out;
}

function score(added: string[], removed: string[]) {
  const text = [...added, ...removed].join(" ").toLowerCase();
  const keywords = KEYWORDS.filter((k) => text.includes(k));
  // More matched keywords and more changed text → more likely to matter. Capped at 1.
  const relevance = Math.min(1, keywords.length / 6 + Math.min(added.length + removed.length, 20) / 80);
  return { keywords, relevance: Math.round(relevance * 100) / 100 };
}

async function main() {
  const publish = process.argv.includes("--publish");
  const rebaseline = process.argv.includes("--rebaseline");
  const useAi = !rebaseline && !process.argv.includes("--no-ai") && (await ollamaAvailable());
  console.log(useAi ? `AI drafts: on (${OLLAMA_MODEL} via Ollama)` : "AI drafts: off");
  ensureDir(SNAP_DIR);
  ensureDir(PENDING_DIR);

  let baselines = 0;
  let unchanged = 0;
  const queued: string[] = [];
  const failed: string[] = [];
  const results: { key: string; current: string[] | null; detected: Detected | null }[] = [];

  for (const key of Object.keys(SOURCES) as SourceKey[]) {
    const src: { name: string; url: string; linkOnly?: string; noisy?: string } = SOURCES[key];
    if (src.linkOnly) continue;
    let lines: string[];
    let fullText = "";
    try {
      const page = await fetchPageText(src.url);
      if (page.pdf) {
        // Official PDFs (e.g. dMAT preparation materials): compare fingerprints; a new version needs a human review.
        const hashPath = join(SNAP_DIR, `${key}.sha256`);
        const old = existsSync(hashPath) ? readFileSync(hashPath, "utf-8").trim() : null;
        writeFileSync(hashPath, page.sha256 ?? "");
        results.push({ key, current: [], detected: null });
        if (!old || rebaseline) baselines++;
        else if (old === page.sha256) unchanged++;
        else {
          const detectedAt = new Date().toISOString();
          const id = `${key}-${detectedAt.replace(/[:.]/g, "-")}`;
          const candidate: ChangeCandidate = {
            id, sourceKey: key, sourceName: src.name, url: src.url, detectedAt,
            added: [`A new version of this official PDF was published. Read it and check whether facts or practice materials (e.g. dMAT task rules in src/lib/prep) must be updated.`],
            removed: [], relevance: 1, keywords: ["pdf", "new version"],
            affectedFacts: FACTS.filter((f) => f.sources.includes(key)).map((f) => ({ id: f.id, title: f.title, brokenAnchors: [] })),
            ai: null,
          };
          writeJson(join(PENDING_DIR, `${id}.json`), candidate);
          queued.push(`${key} (new PDF version)`);
          results[results.length - 1].detected = { key, sourceName: src.name, url: src.url, added: [], removed: [], brokenFacts: [], pdf: true };
        }
        continue;
      }
      fullText = page.lines.join(" ").replace(/\s+/g, " "); // anchors are checked against the full page, not the filtered lines
      lines = normaliseLines(page.lines);
    } catch (e) {
      failed.push(`${key}: ${(e as Error).message}`);
      results.push({ key, current: null, detected: null });
      continue;
    }

    if (!lines.length) {
      results.push({ key, current: null, detected: null });
      // Pages that render only with JavaScript can't be watched this way — report it so a person checks them by hand.
      failed.push(`${key}: no readable text (JavaScript-only page?) — check ${src.url} manually`);
      continue;
    }
    const snapPath = join(SNAP_DIR, `${key}.txt`);
    const result: (typeof results)[number] = { key, current: lines, detected: null };
    results.push(result);
    if (!existsSync(snapPath) || rebaseline) {
      writeFileSync(snapPath, lines.join("\n"));
      baselines++;
      continue;
    }
    const before = readFileSync(snapPath, "utf-8").split("\n").filter(Boolean);
    const beforeSet = new Set(before);
    const afterSet = new Set(lines);
    const added = lines.filter((l) => !beforeSet.has(l));
    const removed = before.filter((l) => !afterSet.has(l));
    writeFileSync(snapPath, lines.join("\n"));
    if (!added.length && !removed.length) {
      unchanged++;
      continue;
    }
    const brokenFor = (k: SourceKey) => FACTS.flatMap((f) => f.anchors.filter((a) => a.source === k && !new RegExp(a.pattern, "i").test(fullText)));
    // Pages that change all the time (daily lessons etc.) only raise a review when a fact's anchor breaks.
    if (src.noisy && brokenFor(key).length === 0) {
      unchanged++;
      continue;
    }

    const affectedFacts = FACTS.filter((f) => f.sources.includes(key) || f.anchors.some((a) => a.source === key)).map((f) => ({
      id: f.id,
      title: f.title,
      brokenAnchors: f.anchors.filter((a) => a.source === key && !new RegExp(a.pattern, "i").test(fullText)).map((a) => a.pattern),
    }));
    const { keywords, relevance } = score(added, removed);
    result.detected = {
      key,
      sourceName: src.name,
      url: src.url,
      // Noisy pages only get here when a fact anchor broke; quote nothing else from them.
      added: src.noisy ? [] : added,
      removed: src.noisy ? [] : removed,
      brokenFacts: affectedFacts.filter((f) => f.brokenAnchors.length).map((f) => ({ id: f.id, title: f.title })),
    };

    let ai: ChangeCandidate["ai"] = null;
    if (useAi) {
      try {
        const draft = await draftAlert({ sourceName: src.name, added, removed });
        ai = draft ? { model: OLLAMA_MODEL, draft, guard: guardDraft(draft, [...added, ...removed].join(" ")) } : { error: "model did not return valid JSON" };
      } catch (e) {
        ai = { error: (e as Error).message };
      }
    }

    const detectedAt = new Date().toISOString();
    const id = `${key}-${detectedAt.replace(/[:.]/g, "-")}`;
    const candidate: ChangeCandidate = { id, sourceKey: key, sourceName: src.name, url: src.url, detectedAt, added, removed, relevance, keywords, affectedFacts, ai };
    writeJson(join(PENDING_DIR, `${id}.json`), candidate);
    queued.push(`${key} (relevance ${relevance}${affectedFacts.some((f) => f.brokenAnchors.length) ? ", FACT ANCHOR BROKEN" : ""})`);
  }

  console.log(`${baselines} new baselines, ${unchanged} unchanged, ${queued.length} changes queued for review, ${failed.length} failed`);
  if (publish && !rebaseline) for (const l of confirmAndPublish(results)) console.log(`  alert ${l}`);
  for (const q of queued) console.log(`  → ${q}`);
  for (const f of failed) console.log(`  ✗ ${f}`);
  // Exit 2 when something needs a human, so a scheduled task can notify (not when publishing by itself).
  if (queued.length && !publish) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
