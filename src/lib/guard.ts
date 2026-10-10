// Guards for AI-written text: an AI summary may only mention numbers, dates and months that appear in the
// official text it summarises. Shared by the alert pipeline (scripts/ai-draft.ts) and the letter explainer.

const MONTHS =
  "january|february|march|april|may|june|july|august|september|october|november|december|januar|februar|märz|mai|juni|juli|oktober|dezember";
const MONTH_NUM: Record<string, string> = {
  january: "1", januar: "1", february: "2", februar: "2", march: "3", märz: "3", april: "4", may: "5", mai: "5", june: "6", juni: "6",
  july: "7", juli: "7", august: "8", september: "9", october: "10", oktober: "10", november: "11", december: "12", dezember: "12",
};

/** Every number and every month name in a text, normalised (11,904 / 11.904 → 11904; "15.11.2026" → 15, 11, 2026). */
export function factTokens(text: string): string[] {
  const t = text.toLowerCase();
  const tokens = new Set<string>();
  for (const m of t.matchAll(/\d[\d.,]*/g)) {
    const raw = m[0].replace(/[.,]+$/, "");
    // German/English thousands separators → plain number; then split dotted dates into their parts.
    const thousands = raw.replace(/[.,](?=\d{3}\b)/g, "");
    if (/^\d+$/.test(thousands)) tokens.add(String(Number(thousands)));
    for (const part of raw.split(/[.,]/)) if (part) tokens.add(String(Number(part)));
    tokens.add(raw.replace(",", "."));
  }
  for (const m of t.matchAll(new RegExp(`\\b(${MONTHS})\\b`, "g"))) tokens.add(`month:${MONTH_NUM[m[1]]}`);
  return [...tokens];
}

/** Numbers/months in `candidate` that do not occur in `source` (months also match their number, e.g. "November" ↔ ".11."). */
export function unsupportedTokens(candidate: string, source: string): string[] {
  const allowed = new Set(factTokens(source));
  // A month name in the AI text is fine if the source has that month as a number in a date (15.11.2026).
  for (const m of source.matchAll(/\b\d{1,2}\.(\d{1,2})\.\d{2,4}\b/g)) allowed.add(`month:${Number(m[1])}`);
  return factTokens(candidate).filter((t) => {
    if (allowed.has(t)) return false;
    if (/^\d+\.\d+$/.test(t) && t.split(".").every((p) => allowed.has(String(Number(p))))) return false;
    return true;
  });
}
