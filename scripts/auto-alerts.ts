// Publishes changes on official pages as alerts — automatically, without a person, so it must be trustworthy by
// construction:
//   • only the official sources in src/content/sources.ts are watched;
//   • an alert quotes the changed lines of the official page word for word; no software writes or rewords anything;
//   • a change is published only when it is still there on the next day's check (two checks in a row), so a page
//     that was briefly broken, half-loaded or showing a rotating teaser doesn't produce an alert;
//   • only lines that matter for students (deadlines, fees, visa, APS, dMAT …) are quoted; other edits are ignored;
//   • a change that breaks a verified fact is marked "important", and the fact itself shows a warning (check-facts).
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Alert } from "../src/lib/alerts.ts";
import { OUT, readJson, writeJson } from "./lib.ts";

export const ALERTS_PATH = join(OUT, "alerts.json");
/** Changes seen once, waiting for the next check to confirm them. Committed with the data, like the snapshots. */
export const UNCONFIRMED_PATH = join(OUT, "watch", "snapshots", "unconfirmed.json");

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
  /health insurance/i, /krankenversicherung/i, /scholarship/i, /stipendi/i, /blue card/i, /blaue karte/i,
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
const clip = (l: string) => (l.length > MAX_QUOTE_LEN ? `${l.slice(0, MAX_QUOTE_LEN - 1).trimEnd()}…` : l);

/** Builds the alert for a confirmed change, or null when nothing in it matters for students. */
export function composeAlert(d: Detected, firstSeen: string, now: string): Alert | null {
  const added = d.added.filter(matters).slice(0, MAX_QUOTES).map(clip);
  const removed = d.removed.filter(matters).slice(0, MAX_QUOTES).map(clip);
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
  };
}

/**
 * Called once per source on every check. `current` is the page's text today (null if it couldn't be read).
 * Returns what to log. A change seen today is stored; if the source's previously stored change still holds today
 * (added lines still there, removed lines still gone), it is published.
 */
export function confirmAndPublish(
  results: { key: string; current: string[] | null; detected: Detected | null }[],
  files = { alerts: ALERTS_PATH, unconfirmed: UNCONFIRMED_PATH }, // other paths only in tests
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
  writeJson(files.alerts, store);
  writeJson(files.unconfirmed, next);
  return log;
}
