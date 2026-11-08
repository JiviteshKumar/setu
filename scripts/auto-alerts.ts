// Publishes changes on official pages as alerts — automatically, without a person, so it must be trustworthy by
// construction:
//   • only the official sources in src/content/sources.ts are watched;
//   • an alert quotes the changed lines of the official page word for word; no software writes or rewords anything;
//   • a change is published only when it is still there on the next day's check (two checks in a row), so a page
//     that was briefly broken, half-loaded or showing a rotating teaser doesn't produce an alert;
//   • only lines that matter for students (deadlines, fees, visa, APS, dMAT …) are quoted; other edits are ignored;
//   • a change that breaks a verified fact is marked "important", and the fact itself shows a warning (check-facts);
//   • news goes out of date by itself: a quoted line that is no longer on the official page is removed from its alert,
//     and an alert whose news is all gone is removed (pruneAlerts, every day).
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Alert } from "../src/lib/alerts.ts";
import { SOURCES, type Source } from "../src/content/sources.ts";
import { OUT, readJson, writeJson } from "./lib.ts";

export const ALERTS_PATH = join(OUT, "alerts.json");
/** Changes seen once, waiting for the next check to confirm them. Committed with the data, like the snapshots. */
export const UNCONFIRMED_PATH = join(OUT, "watch", "snapshots", "unconfirmed.json");
export const FACT_REPORT_PATH = join(OUT, "fact-check-report.json");

const KEEP_DAYS = 180; // automatic alerts older than this are dropped; alerts written by a person are kept
const MAX_QUOTES = 6;
const MAX_QUOTE_LEN = 320;

// A changed line is quoted only if it mentions one of these (English + German). Deliberately stricter than the
// watcher's relevance score: generic words like "new" or a bare year are not enough on their own.
const MATTERS = [
  /\bindia/i, /\bAPS\b/, /\bdMAT\b/i, /\bvisa\b/i, /\bvisum/i, /blocked account/i, /sperrkonto/i, /deadline/i, /\bfrist/i,
  /tuition/i, /studiengebühr/i, /\bfees?\b/i, /gebühr/i, /semester contribution/i, /semesterbeitrag/i, /application/i,
  /bewerbung/i, /admission/i, /zulassung/i, /appointment/i, /\btermin/i, /residence permit/i, /aufenthalt/i,
  /work(ing)? (hours|days)/i, /arbeitstage/i, /\bregistration\b/i, /anmeldung/i, /certificate/i, /zertifikat/i,
  /health insurance/i, /krankenversicherung/i, /scholarship/i, /stipendi/i, /blue card/i, /blaue karte/i, /payment/i, /zahlung/i,
  /passport/i, /reisepass/i, /test (date|centre|center|session)/i, /prüfungstermin/i,
  /\b\d+([.,]\d{3})*([.,]\d+)? ?(€|euros?|eur)\b/i, /€ ?\d/,
];

// Sources about life in Germany; everything else is shown to students still planning from India.
const IN_GERMANY = new Set(["bmg17", "sgb5", "rundfunk", "vwgo70", "vwgo58", "enbBremen", "aufenthg20", "blueCard"]);

export type Detected = {
  key: string;
  sourceName: string;
  url: string;
  added: string[];
  removed: string[];
  brokenFacts: { id: string; title: string }[];
  pdf?: boolean;
};

type Unconfirmed = Record<string, Detected & { firstSeen: string }>;

export const matters = (line: string) => MATTERS.some((r) => r.test(line));

/** May this changed line of this source be quoted? It must matter for students and pass the source's own filters. */
export function quotable(key: string, line: string): boolean {
  const src = (SOURCES as Record<string, Source>)[key];
  if (src?.quoteOnly && !new RegExp(src.quoteOnly, "i").test(line)) return false;
  if (src?.ignore && new RegExp(src.ignore, "i").test(line)) return false;
  return matters(line);
}
const clip = (l: string) => (l.length > MAX_QUOTE_LEN ? `${l.slice(0, MAX_QUOTE_LEN - 1).trimEnd()}…` : l);

/** Builds the alert for a confirmed change, or null when nothing in it matters for students. */
export function composeAlert(d: Detected, firstSeen: string, now: string): Alert | null {
  const added = d.added.filter((l) => quotable(d.key, l)).slice(0, MAX_QUOTES).map(clip);
  const removed = d.removed.filter((l) => quotable(d.key, l)).slice(0, MAX_QUOTES).map(clip);
  if (!d.pdf && !added.length && !removed.length && !d.brokenFacts.length) return null;
  const day = new Date(firstSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const summary = d.pdf
    ? `A new version of this official document was published (noticed on ${day}). Open it to see what changed.`
    : d.brokenFacts.length
      ? `The official page changed (noticed on ${day}), and it no longer contains wording that Setu's fact "${d.brokenFacts.map((f) => f.title).join('", "')}" relies on. Treat that fact as unconfirmed until it is updated, and read the official page.`
      : `The official page changed (noticed on ${day} and still the same a day later). The changed lines are quoted below word for word; open the page for the full context.`;
  return {
    id: `auto-${d.key}-${firstSeen.slice(0, 10)}`,
    publishedAt: now,
    title: d.pdf ? `New version: ${d.sourceName}` : `Changed: ${d.sourceName}`,
    summary,
    severity: d.brokenFacts.length ? "important" : "info",
    audience: [IN_GERMANY.has(d.key) ? "in-germany" : "planning"],
    sources: [{ name: d.sourceName, url: d.url }],
    kind: "detected",
    quotes: { added, removed },
    ...(d.brokenFacts.length ? { facts: d.brokenFacts.map((f) => f.id) } : {}),
  };
}

const sourceKeyOf = (a: Alert) => /^auto-(.+)-\d{4}-\d{2}-\d{2}$/.exec(a.id)?.[1] ?? null;
/** Comparison key that ignores case, spacing and punctuation (a dropped full stop is not news). */
const sameText = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
/** Is a quoted line (possibly clipped with "…") still one of the page's lines? */
const onPage = (quote: string, page: Set<string>, lines: string[]) =>
  quote.endsWith("…") ? lines.some((l) => sameText(l).startsWith(sameText(quote.slice(0, -1)))) : page.has(sameText(quote));

/**
 * Keeps automatic alerts current, every day, without a person:
 *  • quotes that no longer pass the filters (e.g. a news teaser on a fee page) are dropped;
 *  • "Now on the page" lines that have disappeared from the official page again are dropped — that news is outdated;
 *  • "No longer on the page" lines that are back on the page are dropped;
 *  • an alert left with nothing to show is removed;
 *  • an alert about a broken fact becomes a normal update once the fact matches its source again.
 * `pages`: today's lines per source key (sources that couldn't be read are left alone).
 */
export function pruneAlerts(alerts: Alert[], pages: Map<string, string[]>, brokenFacts: Set<string>): { alerts: Alert[]; log: string[] } {
  const log: string[] = [];
  const out: Alert[] = [];
  for (const a of alerts) {
    const key = sourceKeyOf(a);
    if (a.kind !== "detected" || !key || !a.quotes) {
      out.push(a);
      continue;
    }
    const lines = pages.get(key);
    const page = lines ? new Set(lines.map(sameText)) : null;
    const hadNews = a.quotes.added.length > 0;
    const added = a.quotes.added.filter((q) => quotable(key, q.replace(/…$/, "")) && (!page || onPage(q, page, lines!)));
    const removed = a.quotes.removed.filter((q) => quotable(key, q.replace(/…$/, "")) && (!page || !onPage(q, page, lines!)));
    const factsBroken = (a.facts ?? []).some((f) => brokenFacts.has(f));
    const isPdf = a.title.startsWith("New version:");
    if (!isPdf && !factsBroken && ((hadNews && !added.length) || (!added.length && !removed.length))) {
      log.push(`removed (outdated or not relevant): ${a.title} (${a.publishedAt.slice(0, 10)})`);
      continue;
    }
    const next: Alert = { ...a, quotes: { added, removed } };
    // Alerts published before the `facts` field existed are recognised by their wording.
    const aboutFact = !!a.facts?.length || a.summary.includes("no longer contains wording that Setu's fact");
    if (aboutFact && !factsBroken) {
      // The fact was updated and matches its source again: this is an ordinary change now.
      next.severity = "info";
      next.summary = next.summary.replace(/, and it no longer contains wording that Setu's fact .*$/, ". The changed lines are quoted below word for word; open the page for the full context.");
      delete next.facts;
    }
    if (JSON.stringify(next) !== JSON.stringify(a)) log.push(`updated: ${a.title} (${a.publishedAt.slice(0, 10)})`);
    out.push(next);
  }
  return { alerts: out, log };
}

/**
 * Called once per source on every check. `current` is the page's text today (null if it couldn't be read).
 * Returns what to log. A change seen today is stored; if the source's previously stored change still holds today
 * (added lines still there, removed lines still gone), it is published.
 */
export function confirmAndPublish(
  results: { key: string; current: string[] | null; detected: Detected | null }[],
  files: { alerts: string; unconfirmed: string; factReport?: string } = { alerts: ALERTS_PATH, unconfirmed: UNCONFIRMED_PATH, factReport: FACT_REPORT_PATH }, // other paths only in tests
): string[] {
  const log: string[] = [];
  const now = new Date().toISOString();
  const pending: Unconfirmed = existsSync(files.unconfirmed) ? readJson(files.unconfirmed) : {};
  const store: { alerts: Alert[] } = existsSync(files.alerts) ? readJson(files.alerts) : { alerts: [] };
  const next: Unconfirmed = {};

  for (const r of results) {
    const old = pending[r.key];
    if (old && r.current) {
      const today = new Set(r.current);
      const stillAdded = old.added.filter((l) => today.has(l));
      const stillRemoved = old.removed.filter((l) => !today.has(l));
      const held = old.pdf || stillAdded.length || stillRemoved.length || old.brokenFacts.length;
      if (held) {
        const alert = composeAlert({ ...old, added: stillAdded, removed: stillRemoved }, old.firstSeen, now);
        if (alert && !store.alerts.some((a) => a.id === alert.id)) {
          store.alerts.push(alert);
          log.push(`published: ${alert.title}`);
        } else if (!alert) log.push(`ignored (nothing that matters for students): ${old.sourceName}`);
      } else log.push(`not published (change was reverted): ${old.sourceName}`);
    } else if (old) {
      next[r.key] = old; // page unreadable today: keep waiting
    }
    if (r.detected) {
      // A new change today: merge with anything still waiting, so it is confirmed tomorrow.
      next[r.key] = { ...r.detected, firstSeen: next[r.key]?.firstSeen ?? now };
      log.push(`seen, waiting for tomorrow's check: ${r.detected.sourceName}`);
    }
  }

  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  store.alerts = store.alerts.filter((a) => a.kind !== "detected" || Date.parse(a.publishedAt) > cutoff);
  const pages = new Map(results.filter((r) => r.current?.length).map((r) => [r.key, r.current!]));
  const report: { status?: Record<string, { brokenSince?: string }> } = files.factReport && existsSync(files.factReport) ? readJson(files.factReport) : {};
  const broken = new Set(Object.entries(report.status ?? {}).filter(([, s]) => s.brokenSince).map(([id]) => id));
  const pruned = pruneAlerts(store.alerts, pages, broken);
  store.alerts = pruned.alerts;
  log.push(...pruned.log);
  writeJson(files.alerts, store);
  writeJson(files.unconfirmed, next);
  return log;
}
