// Finds application deadlines on a university's own course page, and compares them with DAAD's. Rule-based on
// purpose: it only reports sentences that are on the page (quoted) and dates written in them — it never guesses.
// Used by scripts/check-uni-pages.ts (weekly, in the cloud) and by "Check university pages" in My plan.

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, januar: 1, jänner: 1, february: 2, feb: 2, februar: 2, march: 3, mar: 3, märz: 3, maerz: 3, april: 4, apr: 4,
  may: 5, mai: 5, june: 6, jun: 6, juni: 6, july: 7, jul: 7, juli: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, oktober: 10, okt: 10, november: 11, nov: 11, december: 12, dec: 12, dezember: 12, dez: 12,
};
const MONTH = "(january|february|march|april|may|june|july|august|september|october|november|december|januar|jänner|februar|märz|maerz|juni|juli|oktober|dezember|jan|feb|mar|apr|mai|jun|jul|aug|sept|sep|oct|okt|nov|dec|dez)\\.?";
const DATE_PATTERNS: { re: RegExp; get: (m: RegExpExecArray) => [number, number] }[] = [
  // 15 July, 15th of July, 15. Juli
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\.?\\s+(?:of\\s+)?${MONTH}(?![a-zäöü])`, "gi"), get: (m) => [Number(m[1]), MONTHS[m[2].toLowerCase()]] },
  // July 15, July 15th
  { re: new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!\\.\\d)`, "gi"), get: (m) => (m[1] === "may" ? [0, 0] : [Number(m[2]), MONTHS[m[1].toLowerCase()]]) }, // lowercase "may" is the verb
  // 15.07. or 15.07.2027 (German numeric dates)
  { re: /\b(\d{1,2})\.(\d{1,2})\.(?:(?:20)?\d{2}\b)?/g, get: (m) => [Number(m[1]), Number(m[2])] },
  // 2027-07-15
  { re: /\b20\d{2}-(\d{2})-(\d{2})\b/g, get: (m) => [Number(m[2]), Number(m[1])] },
];
const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Words that mark a sentence as being about the application deadline (English and German). */
const DEADLINE_WORDS =
  /deadline|application period|application window|closing date|apply (?:by|until|before|between)|applications? (?:must|can|are|is|will|should|close|open|period|phase)|bewerbungs(?:frist|zeitraum|schluss|ende|phase|zeit)|bewerbung (?:bis|ist|vom)|bewerbungen|einschreibefrist|\bfristen?\b|anmeldefrist/i;

/** "MM-DD" for every valid calendar date written in the text. */
export function datesIn(text: string): string[] {
  const out = new Set<string>();
  for (const { re, get } of DATE_PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const [d, mo] = get(m);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= DAYS_IN_MONTH[mo]) out.add(`${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
    }
  }
  return [...out].sort();
}

export type DeadlineFinding = { snippets: string[]; dates: string[] };

// Sentences only for German / EU applicants are left out — Indian applicants never fall under them (same rule as
// isEuOnly for DAAD's deadlines).
const EU_GROUP =
  /\b(german|eu|eea|european)\b[^.;:]{0,40}\b(citizens?|students?|applicants?|nationals?)\b|\b(deutsche|eu)[- ]?(bürger|bewerber|studierende)|\bfür deutsche\b|bildungsinländer/i;
const NON_EU =
  /non[- ]?eu|third[- ]countr|international (students|applicants)|foreign|nicht[- ]?eu|drittstaat|internationale|ausländisch|outside (the )?(eu|european union)|\bindia/i;
export const euOnly = (text: string) => EU_GROUP.test(text) && !NON_EU.test(text);

/**
 * Sentences on the page that talk about the application deadline and contain a date. A heading such as
 * "Application deadline" followed by short lines with dates counts as one sentence.
 */
export function findDeadlines(lines: string[], max = 6): DeadlineFinding {
  const snippets: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length && snippets.length < max; i++) {
    const line = lines[i].trim();
    if (!DEADLINE_WORDS.test(line)) continue;
    // Short lines right below with dates belong to it ("Non-EU applicants: 15 March").
    const follow: string[] = [];
    let used = 0;
    for (const l of lines.slice(i + 1, i + 5)) {
      const t = l.trim();
      if (t.length > 160 || !datesIn(t).length || DEADLINE_WORDS.test(t)) break;
      used++;
      if (!euOnly(t)) follow.push(t);
    }
    if (!datesIn(line).length && (!follow.length || line.length > 120)) continue;
    let text = [line, ...follow].join(" ");
    if (text.length > 400) {
      // Keep the part around the first date so long paragraphs stay readable.
      const at = Math.max(0, text.search(DATE_PATTERNS[0].re));
      text = `${at > 150 ? "…" : ""}${text.slice(Math.max(0, at - 150), at + 230).trim()}…`;
    }
    if (seen.has(text) || euOnly(text) || !datesIn(text).length) continue;
    seen.add(text);
    snippets.push(text);
    i += used;
  }
  const kept = dedupeSnippets(snippets);
  return { snippets: kept, dates: datesIn(kept.join(" ")) };
}

/** Drops a sentence that is already contained in a longer one (pages often repeat a sentence under a heading). */
export function dedupeSnippets(snippets: string[]): string[] {
  const core = (s: string) => s.replace(/…/g, "").trim();
  return snippets.filter((s, i) => !snippets.some((o, j) => j !== i && core(o).includes(core(s)) && (core(o) !== core(s) || j < i)));
}

export type UniPage = {
  url: string;
  /** ok: read; unreadable: no text (JavaScript-only page); blocked: robots.txt asks bots not to read it; error: not reachable */
  status: "ok" | "unreadable" | "blocked" | "error";
  checkedAt: string;
  snippets: string[];
  dates: string[];
  /** When the deadline sentences last changed, and what they said before. */
  changedAt?: string;
  before?: string[];
};

export type Verdict =
  | { kind: "match"; dates: string[] }
  | { kind: "differs"; daadOnly: string[]; uniOnly: string[] }
  | { kind: "extra"; uniOnly: string[] } // DAAD gives no fixed date, the university page does
  | { kind: "none" }
  | { kind: "unread"; reason: string };

/** Compares DAAD's deadline dates ("MM-DD") with the dates found in the university page's deadline sentences. */
export function compareDeadlines(daadUntil: string[], page: Pick<UniPage, "status" | "dates" | "snippets"> | undefined): Verdict {
  if (!page) return { kind: "unread", reason: "This course page hasn't been read yet." };
  if (page.status === "blocked") return { kind: "unread", reason: "The university asks automated tools not to read this page." };
  if (page.status === "error") return { kind: "unread", reason: "The page couldn't be reached on the last check." };
  if (page.status === "unreadable" || !page.snippets.length) return page.status === "unreadable" ? { kind: "unread", reason: "The page only shows its text with JavaScript, so it can't be read automatically." } : { kind: "none" };
  const daad = new Set(daadUntil);
  const uni = new Set(page.dates);
  const daadOnly = [...daad].filter((d) => !uni.has(d));
  const uniOnly = [...uni].filter((d) => !daad.has(d));
  if (!daad.size) return { kind: "extra", uniOnly };
  if (!daadOnly.length) return { kind: "match", dates: [...daad] };
  return { kind: "differs", daadOnly, uniOnly };
}
