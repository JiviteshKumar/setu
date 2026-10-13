// Tests for the automatic checks that publish without a person: deadline reading on university pages
// (src/lib/uniDeadlines.ts), robots.txt handling (check-uni-pages.ts) and automatic alerts (auto-alerts.ts).
//   npm run test:unipages
import { compareDeadlines, datesIn, euOnly, findDeadlines } from "../src/lib/uniDeadlines.ts";
import { parseRobots } from "./check-uni-pages.ts";
import { composeAlert, confirmAndPublish, matters } from "./auto-alerts.ts";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let failures = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures++;
    console.error(`✗ ${label}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`);
  }
};

// ── Dates ──
eq("English day month", datesIn("until 15 July"), ["07-15"]);
eq("ordinal + of", datesIn("by the 1st of March 2027"), ["03-01"]);
eq("month day", datesIn("Apply by May 31st, 2027."), ["05-31"]);
eq("German long", datesIn("bis zum 15. Juli 2027"), ["07-15"]);
eq("German numeric", datesIn("Bewerbungsfrist: 15.01.2027"), ["01-15"]);
eq("German numeric, no year", datesIn("vom 01.12. bis 15.01."), ["01-15", "12-01"]);
eq("ISO", datesIn("deadline 2027-03-31"), ["03-31"]);
eq("impossible date ignored", datesIn("31 February, 32.01."), []);
eq("money is not a date", datesIn("fee of 1.500 EUR, 20.000 euros"), []);
eq("version numbers are not dates", datesIn("Release 2.1 and 4.5"), []);
eq("'may' as a verb is not a month", datesIn("you may 15 times"), []);

// ── Deadline sentences ──
eq("heading + next line", findDeadlines(["Application deadline", "15 July", "Contact us"]).snippets, ["Application deadline 15 July"]);
eq("sentence with a date", findDeadlines(["Applications are open from 1 January to 15 April."]).dates, ["01-01", "04-15"]);
eq(
  "EU-only lines below a heading are left out",
  findDeadlines(["Application deadlines", "German, EU citizens: 15 September", "Non-EU citizens: 15 March", "Contact"]).snippets,
  ["Application deadlines Non-EU citizens: 15 March"],
);
eq("an EU-only sentence is left out", findDeadlines(["Deadline: 30 June to 31 August for German or EU students (winter term)"]).snippets, []);
eq("German EU-only sentence is left out", findDeadlines(["Bewerbungsfrist für Deutsche: 15. Juli"]).snippets, []);
eq(
  "mixed sentence is kept",
  findDeadlines(["The deadline for German students is August 31st and for international students May 31st."]).dates,
  ["05-31", "08-31"],
);
eq("dates without deadline words are ignored", findDeadlines(["Lecture starts on 14 October", "Founded 1 May 1972"]).snippets, []);
eq("heading without a date nearby is ignored", findDeadlines(["Application deadline", "See the application portal", "Opening hours 9-12"]).snippets, []);
eq("German heading", findDeadlines(["Bewerbungsfrist", "15.07. (Wintersemester)"]).dates, ["07-15"]);
eq(
  "a sentence repeated under its heading is quoted once",
  findDeadlines(["What is the deadline? The deadline for international students is May 31st.", "The deadline for international students is May 31st."]).snippets,
  ["What is the deadline? The deadline for international students is May 31st."],
);
eq("EU wording inside words is not EU-only", euOnly("Deutsch B2 required, deadline 15 July"), false);

// ── Comparison ──
const ok = (dates: string[]) => ({ status: "ok" as const, dates, snippets: ["x"] });
eq("all DAAD dates on the page → match", compareDeadlines(["03-15"], ok(["03-15", "09-15"])).kind, "match");
eq("DAAD date missing → differs", compareDeadlines(["07-15"], ok(["04-15", "10-15"])), { kind: "differs", daadOnly: ["07-15"], uniOnly: ["04-15", "10-15"] });
eq("no DAAD dates but page has dates → extra information", compareDeadlines([], ok(["05-31"])), { kind: "extra", uniOnly: ["05-31"] });
eq("no deadline sentence → none", compareDeadlines(["07-15"], { status: "ok", dates: [], snippets: [] }).kind, "none");
eq("blocked → unread", compareDeadlines(["07-15"], { status: "blocked", dates: [], snippets: [] }).kind, "unread");
eq("not read yet → unread", compareDeadlines(["07-15"], undefined).kind, "unread");

// ── robots.txt ──
const rules = parseRobots("User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /intern/\nDisallow: /*.pdf$\nAllow: /\n");
const blocked = (p: string) => rules.some((r) => r.test(p));
eq("other bots' rules don't apply", blocked("/en/studies/master"), false);
eq("* rules apply", blocked("/intern/page"), true);
eq("wildcard + end anchor", [blocked("/docs/a.pdf"), blocked("/docs/a.pdf?x=1")], [true, false]);
const ours = parseRobots("User-agent: *\nDisallow:\n\nUser-agent: SetuGermanyBot\nDisallow: /\n");
eq("a group for our bot wins", ours.some((r) => r.test("/anything")), true);
eq("empty Disallow allows everything", parseRobots("User-agent: *\nDisallow:\n").length, 0);

// ── Automatic alerts ──
eq("deadline line matters", matters("The application deadline is now 15 June."), true);
eq("news teaser doesn't matter", matters("Using AI to respond more quickly to traffic hazards"), false);
eq("money matters", matters("The blocked amount is 11,904 euros"), true);
const base = { key: "tumFees", sourceName: "TUM fees", url: "https://www.tum.de/x", brokenFacts: [] };
eq("irrelevant change → no alert", composeAlert({ ...base, added: ["RobCo is TUM’s 24th unicorn"], removed: [] }, "2026-10-13T05:00:00Z", "2026-10-14T05:00:00Z"), null);
const alert = composeAlert({ ...base, added: ["Tuition fee: 6,000 euros per semester", "Campus news"], removed: [] }, "2026-10-13T05:00:00Z", "2026-10-14T05:00:00Z");
eq("relevant change → quotes only the lines that matter, verbatim", alert?.quotes, { added: ["Tuition fee: 6,000 euros per semester"], removed: [] });
eq("automatic alert is marked as such", [alert?.kind, alert?.severity, alert?.sources[0].url], ["detected", "info", "https://www.tum.de/x"]);
const broken = composeAlert({ ...base, added: [], removed: [], brokenFacts: [{ id: "f", title: "TUM fees" }] }, "2026-10-13T05:00:00Z", "2026-10-14T05:00:00Z");
eq("a broken fact makes it important", broken?.severity, "important");

// ── Two-morning confirmation (real files in a temporary folder) ──
{
  const dir = mkdtempSync(join(tmpdir(), "setu-alerts-"));
  const files = { alerts: join(dir, "alerts.json"), unconfirmed: join(dir, "unconfirmed.json") };
  const published = () => (JSON.parse(readFileSync(files.alerts, "utf-8")) as { alerts: { title: string; quotes: unknown }[] }).alerts;
  const page1 = ["Visa appointments: book via the Consular Services Portal.", "Menu"];
  const page2 = ["Visa appointments: book via the Consular Services Portal.", "New: the blocked account amount is 11,904 euros.", "Menu"];
  const det = (added: string[], removed: string[] = []) => ({ key: "indiaStudyVisa", sourceName: "Studies visa", url: "https://india.diplo.de/x", added, removed, brokenFacts: [] });

  confirmAndPublish([{ key: "indiaStudyVisa", current: page2, detected: det([page2[1]]) }], files);
  eq("day 1: a new change is not published yet", published().length, 0);
  confirmAndPublish([{ key: "indiaStudyVisa", current: page2, detected: null }], files);
  eq("day 2: still there → published, quoted verbatim", published().map((a) => a.quotes), [{ added: [page2[1]], removed: [] }]);
  confirmAndPublish([{ key: "indiaStudyVisa", current: page2, detected: null }], files);
  eq("day 3: not published twice", published().length, 1);

  confirmAndPublish([{ key: "tumFees", current: page2, detected: { ...det(["Application deadline moved to 15 May"]), key: "tumFees" } }], files);
  confirmAndPublish([{ key: "tumFees", current: page1, detected: null }], files);
  eq("a change that was reverted the next day is not published", published().length, 1);

  confirmAndPublish([{ key: "apsHome", current: page1, detected: { ...det(["Application deadline is 1 June"]), key: "apsHome" } }], files);
  confirmAndPublish([{ key: "apsHome", current: null, detected: null }], files);
  eq("page unreachable on day 2: keeps waiting", published().length, 1);
  confirmAndPublish([{ key: "apsHome", current: ["Application deadline is 1 June"], detected: null }], files);
  eq("…and is published once it can be read again", published().length, 2);
  rmSync(dir, { recursive: true });
}

if (failures) {
  console.error(`✗ ${failures} automatic-check test(s) failed`);
  process.exit(1);
}
console.log("✓ university-page reading, robots.txt and automatic alerts behave as intended");
