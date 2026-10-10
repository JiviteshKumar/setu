// Spelling-tolerant search for names of German places and universities. Indian students usually type the English
// name or leave out umlauts: "Munich", "munchen" and "muenchen" must all find "München".

/** Lower case, accents removed, ß → ss, and the German spellings ae/oe/ue → a/o/u (applied to both sides alike). */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u");
}

// English ↔ German names (already folded).
const ALIASES: string[][] = [
  ["munich", "munchen"],
  ["cologne", "koln"],
  ["nuremberg", "nurnberg"],
  ["hanover", "hannover"],
  ["brunswick", "braunschweig"],
  ["bavaria", "bayern"],
  ["saxony", "sachsen"],
  ["thuringia", "thuringen"],
  ["hesse", "hessen"],
  ["frankfurt on the main", "frankfurt am main"],
  ["mayence", "mainz"],
  ["treves", "trier"],
];
const alternatives = new Map<string, string[]>();
for (const group of ALIASES) for (const w of group) alternatives.set(w, group);

/** Builds a matcher: every word of the query must occur in the text (or an English/German equivalent of it). */
export function matcher(query: string): (text: string) => boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return () => true;
  return (text: string) => {
    const hay = fold(text);
    return words.every((w) => hay.includes(w) || (alternatives.get(w) ?? []).some((a) => hay.includes(a)));
  };
}
