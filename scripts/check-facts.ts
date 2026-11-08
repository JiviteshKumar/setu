// Re-checks every published fact against its official source (daily, in the cloud — see pages.yml).
//   1. Every source URL must still load.
//   2. Every anchor phrase of every fact must still appear on its source page.
//   3. For facts with a `live` section, the current wording of that section of the official page is saved, word for word,
//      so the site can show it in place of a summary that no longer matches (see FactCard).
// The result is remembered between runs (data/fact-check-report.json): a fact whose wording disappeared stays marked
// as changed until a later check finds it again — a day on which the source can't be reached changes nothing.
// Exit code 1 when a fact no longer matches its source, 3 when the only problem is unreachable sources.
//
//   npm run check:facts
import { existsSync } from "node:fs";
import { join } from "node:path";
import { FACTS, type Fact } from "../src/content/facts.ts";
import { SOURCES, type SourceKey } from "../src/content/sources.ts";
import { OUT, readJson, sourcePageText, writeJson } from "./lib.ts";

export type FactCheckReport = {
  checkedAt: string;
  facts: number;
  sources: number;
  skipped: string[];
  problems: { fact?: string; source: string; problem: string }[];
  /** Per fact: when it last fully matched its sources, and since when its wording has been missing. */
  status: Record<string, { lastOk?: string; brokenSince?: string; missing?: string[] }>;
  /** Per fact: the current wording of the official page's matching section(s), quoted verbatim. */
  live: Record<string, { at: string; sections: { source: SourceKey; lines: string[] }[] }>;
};

const REPORT = join(OUT, "fact-check-report.json");
const MAX_LIVE_LINES = 16;
const MAX_LINE = 400;

/** Lines of the page from the first line matching `start` up to (not including) the first later line matching `end`. */
export function extractSection(lines: string[], start: string, end: string, max = MAX_LIVE_LINES): string[] {
  const clean = lines.map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l && l !== "•");
  const from = clean.findIndex((l) => new RegExp(start, "i").test(l));
  if (from < 0) return [];
  const out: string[] = [];
  for (const l of clean.slice(from)) {
    if (out.length && new RegExp(end, "i").test(l)) break;
    out.push(l.length > MAX_LINE ? `${l.slice(0, MAX_LINE - 1).trimEnd()}…` : l);
    if (out.length >= max) break;
  }
  return out;
}

async function main() {
  const now = new Date().toISOString();
  const prev: Partial<FactCheckReport> = existsSync(REPORT) ? readJson(REPORT) : {};
  const status: FactCheckReport["status"] = { ...(prev.status ?? {}) };
  const live: FactCheckReport["live"] = { ...(prev.live ?? {}) };

  const pages = new Map<SourceKey, { text?: string; lines?: string[]; error?: string }>();
  const skipped: string[] = [];
  for (const key of Object.keys(SOURCES) as SourceKey[]) {
    const src: { url: string; linkOnly?: string } = SOURCES[key];
    if (src.linkOnly) {
      skipped.push(`${src.url} (${src.linkOnly})`);
      continue;
    }
    try {
      const page = await sourcePageText(SOURCES[key], 5); // official sites sometimes reset or time out; retry patiently
      pages.set(key, { text: page.lines.join(" ").replace(/\s+/g, " "), lines: page.lines });
    } catch (e) {
      pages.set(key, { error: (e as Error).message });
    }
  }

  const problems: FactCheckReport["problems"] = [];
  for (const [key, page] of pages) {
    if (page.error) problems.push({ source: SOURCES[key].url, problem: `source unreachable: ${page.error}` });
  }
  for (const fact of FACTS) {
    if (!fact.anchors.length) problems.push({ fact: fact.id, source: "-", problem: "fact has no anchors — it cannot be checked automatically" });
    if (!fact.sources.every((s) => s in SOURCES)) problems.push({ fact: fact.id, source: "-", problem: "unknown source key" });
    for (const s of fact.sources) {
      if ((SOURCES[s] as { linkOnly?: string }).linkOnly) problems.push({ fact: fact.id, source: SOURCES[s].url, problem: "facts must not rely on a link-only source" });
    }
    checkFact(fact, pages, status, problems, now);
    for (const sec of fact.live ?? []) {
      const lines = pages.get(sec.source)?.lines;
      if (!lines) continue; // unreachable today: keep the last wording we saw
      const got = extractSection(lines, sec.start, sec.end, sec.max);
      const entry = (live[fact.id] = live[fact.id]?.at === now ? live[fact.id] : { at: now, sections: [] });
      if (got.length) entry.sections.push({ source: sec.source, lines: got });
    }
    if (live[fact.id] && !live[fact.id].sections.length) delete live[fact.id];
  }
  // Facts that were removed from facts.ts don't keep a status.
  for (const id of Object.keys(status)) if (!FACTS.some((f) => f.id === id)) delete status[id];
  for (const id of Object.keys(live)) if (!FACTS.some((f) => f.id === id && f.live?.length)) delete live[id];

  const report: FactCheckReport = { checkedAt: now, facts: FACTS.length, sources: pages.size, skipped, problems, status, live };
  for (const s of skipped) console.warn(`! not auto-checked (link only): ${s}`);
  writeJson(REPORT, report);
  if (problems.length) {
    console.error(`✗ ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p.fact ?? "(source)"}: ${p.problem}\n    ${p.source}`);
    const onlyUnreachable = problems.every((p) => !p.fact && p.problem.startsWith("source unreachable"));
    if (onlyUnreachable) console.error("(No fact failed its check; these sources could not be reached and were not re-checked.)");
    process.exit(onlyUnreachable ? 3 : 1);
  }
  console.log(`✓ All ${FACTS.length} facts still match their ${pages.size} official sources.`);
}

/** Updates one fact's remembered status from today's pages. */
function checkFact(fact: Fact, pages: Map<SourceKey, { text?: string; error?: string }>, status: FactCheckReport["status"], problems: FactCheckReport["problems"], now: string) {
  const prev = status[fact.id] ?? {};
  const unreachable = fact.anchors.some((a) => !pages.get(a.source)?.text);
  if (unreachable) {
    // Not re-checked today: keep what we knew. A fact already known to be out of date stays marked.
    if (prev.brokenSince)
      problems.push({ fact: fact.id, source: "-", problem: `wording missing on the official page since ${prev.brokenSince.slice(0, 10)} (not re-checked today: a source was unreachable)` });
    return;
  }
  const missing = fact.anchors.filter((a) => !new RegExp(a.pattern, "i").test(pages.get(a.source)!.text!));
  for (const a of missing) problems.push({ fact: fact.id, source: SOURCES[a.source].url, problem: `anchor "${a.pattern}" no longer found — the official page changed` });
  status[fact.id] = missing.length
    ? { lastOk: prev.lastOk, brokenSince: prev.brokenSince ?? now, missing: missing.map((a) => a.pattern) }
    : { lastOk: now };
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
