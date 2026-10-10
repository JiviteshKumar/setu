// Rule-based analysis of a German official letter. Every finding quotes the sentence it came from,
// so the student can check it against the letter. Nothing here guesses facts that aren't in the text.
import { termsIn, type Term } from "./glossary.ts";

export type Quote = { text: string; sentence: string };
export type LetterType = { id: string; label: string; what: string; confidence: "likely" | "possible" };
export type Analysis = {
  types: LetterType[];
  deadlines: Quote[];
  relativeDeadlines: Quote[];
  appointments: Quote[];
  amounts: Quote[];
  references: { label: string; value: string }[];
  actions: { id: string; label: string; sentence: string }[];
  hasObjectionInfo: boolean;
  warnings: { label: string; sentence?: string }[];
  terms: Term[];
};

const TYPES: { id: string; label: string; what: string; words: RegExp[] }[] = [
  {
    id: "rundfunk",
    label: "Broadcasting fee (Rundfunkbeitrag)",
    what: "The broadcasting fee is charged once per flat, not per person. If you share a flat and someone already pays, you can tell the Beitragsservice their contribution number.",
    words: [/beitragsservice/i, /rundfunkbeitrag/i, /ard zdf deutschlandradio/i, /beitragsnummer/i],
  },
  {
    id: "immigration",
    label: "Foreigners' office (Ausländerbehörde)",
    what: "Letters about your residence permit. Missing a deadline or appointment here can affect your right to stay — act early and keep copies of everything.",
    words: [/ausländerbehörde|ausländeramt|landesamt für einwanderung/i, /aufenthaltstitel|aufenthaltserlaubnis/i, /fiktionsbescheinigung/i, /aufenthaltsgesetz|aufenthg/i],
  },
  {
    id: "registration",
    label: "Registration office (Bürgeramt / Meldebehörde)",
    what: "About registering or de-registering your address.",
    words: [/bürgeramt|bürgerbüro|meldebehörde|einwohnermeldeamt/i, /meldebescheinigung|anmeldung|abmeldung/i, /bundesmeldegesetz|bmg/i],
  },
  {
    id: "tax",
    label: "Tax office (Finanzamt / Bundeszentralamt für Steuern)",
    what: "Tax letters. The letter with your tax ID (Steuer-Identifikationsnummer) is important — keep it, your employer needs the number.",
    words: [/finanzamt/i, /bundeszentralamt für steuern/i, /identifikationsnummer|steuer-id/i, /steuerbescheid|einkommensteuer/i],
  },
  {
    id: "health",
    label: "Health insurance (Krankenkasse)",
    what: "From your health insurer: membership, contributions or requests for documents such as your enrolment certificate.",
    words: [/krankenkasse|krankenversicherung/i, /versichertennummer/i, /\baok\b|techniker|barmer|\bdak\b|\bhkk\b|\bikk\b/i],
  },
  {
    id: "university",
    label: "University",
    what: "From your university: enrolment, re-registration (Rückmeldung), exams or fees.",
    words: [/universität|hochschule/i, /immatrikulation|exmatrikulation|rückmeldung/i, /semesterbeitrag|prüfungsamt/i],
  },
  {
    id: "fine",
    label: "Fine (Bußgeld)",
    what: "A fine for an administrative offence (for example in traffic or on public transport). It usually allows you to respond or object within a set time.",
    words: [/bußgeld/i, /verwarnungsgeld/i, /ordnungswidrigkeit/i, /anhörungsbogen/i],
  },
  {
    id: "debt",
    label: "Payment demand / debt collection",
    what: "Someone says you owe money. Check that the original claim is real (do you know the company? is the amount right?) before paying, and don't ignore it.",
    words: [/inkasso/i, /\bmahnung\b|mahngebühr|zahlungserinnerung/i, /mahnbescheid/i, /forderung/i],
  },
  {
    id: "tenancy",
    label: "Landlord / tenancy",
    what: "About your flat: rent, deposit, utility statement or termination.",
    words: [/vermieter|hausverwaltung/i, /mietvertrag|miete\b/i, /nebenkosten|betriebskosten/i, /kaution/i],
  },
];

const MONTHS: Record<string, number> = {
  januar: 1, jänner: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
};

const DATE_RE = new RegExp(String.raw`\b(\d{1,2})\.\s?(?:(\d{1,2})\.\s?(\d{2,4})|(${Object.keys(MONTHS).join("|")})\s+(\d{4}))\b`, "gi");

function sentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    // A dot after a 1–2 digit number ("15. November", "3. Etage") is not the end of a sentence.
    .split(/(?<!\b\d{1,2}\.)(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])|\n{2,}|\n(?=[A-ZÄÖÜ•\-])/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 3);
}

export function analyzeLetter(raw: string): Analysis {
  const text = raw.replace(/[ \t]+/g, " ");
  const sents = sentences(text);
  const find = (re: RegExp) => sents.filter((s) => re.test(s));

  // Letter type: count keyword groups that match; 2+ groups = likely, 1 = possible.
  // Only a second type that matches as strongly as the first is shown (a letter mentioning another office isn't from it).
  const scored = TYPES.map((t) => ({ t, hits: t.words.filter((w) => w.test(text)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  const types = scored
    .filter((x, i) => i === 0 || x.hits === scored[0].hits)
    .slice(0, 2)
    .map(({ t, hits }) => ({ id: t.id, label: t.label, what: t.what, confidence: hits >= 2 ? ("likely" as const) : ("possible" as const) }));

  const deadlines: Quote[] = [];
  const appointments: Quote[] = [];
  for (const s of sents) {
    for (const m of s.matchAll(DATE_RE)) {
      const q = { text: m[0], sentence: s };
      if (/termin|vorsprache|vorsprechen|erscheinen|\buhr\b|zimmer|raum\b/i.test(s)) appointments.push(q);
      else if (/\bbis\b|spätestens|frist|fällig|zahlbar|innerhalb|einzureichen|nachzureichen|vorzulegen|zu zahlen|zu überweisen/i.test(s)) deadlines.push(q);
    }
  }

  const relativeDeadlines: Quote[] = [];
  for (const s of sents) {
    const m = s.match(/(innerhalb|binnen)\s+(von\s+)?(eines|einer|einem|zwei|drei|vier|fünf|sechs|zehn|vierzehn|\d+)\s+(stunde(n)?|tag(en|e)?|woche(n)?|monat(s|en)?)/i);
    if (m) relativeDeadlines.push({ text: m[0], sentence: s });
  }

  const amounts: Quote[] = [];
  for (const s of sents) for (const m of s.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+)\s?(€|EUR\b|Euro\b)|(€|EUR)\s?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+)/g)) amounts.push({ text: m[0], sentence: s });

  const references: { label: string; value: string }[] = [];
  const REF = /(Aktenzeichen|Az\.?|Kassenzeichen|Beitragsnummer|Kundennummer|Steuernummer|Identifikationsnummer|Versichertennummer|Rechnungsnummer|Vorgangsnummer|Geschäftszeichen|Mitgliedsnummer|Matrikelnummer)\s*:?\s*([A-Z0-9][A-Z0-9 ./\-]{3,30}[A-Z0-9])/gi;
  for (const m of text.matchAll(REF)) {
    const value = m[2].replace(/\s{2,}.*/, "").trim();
    if (!references.some((r) => r.value === value)) references.push({ label: m[1], value });
  }

  const ACTIONS: { id: string; label: string; re: RegExp }[] = [
    { id: "pay", label: "Pay an amount", re: /überweisen|zahlen sie|bitte zahlen|zu zahlen|zahlung|begleichen|bezahlen/i },
    { id: "documents", label: "Send or bring documents", re: /einreichen|einzureichen|nachreichen|nachzureichen|vorlegen|vorzulegen|zusenden|übersenden|mitbringen|mitzubringen/i },
    { id: "appointment", label: "Attend an appointment", re: /\btermin\b|vorsprache|vorsprechen|erscheinen sie/i },
    { id: "respond", label: "Reply or give your side", re: /stellung nehmen|stellungnahme|äußern|anhörung|rückmeldung geben|teilen sie uns mit|mitteilen/i },
    { id: "sign", label: "Sign something", re: /unterschreiben|unterzeichnen|unterschrift/i },
    { id: "object", label: "You may object (Widerspruch)", re: /widerspruch/i },
  ];
  const actions = ACTIONS.flatMap((a) => {
    const s = find(a.re)[0];
    return s ? [{ id: a.id, label: a.label, sentence: s }] : [];
  });

  const warnings: { label: string; sentence?: string }[] = [];
  const gift = find(/gutschein|paysafecard|google play|itunes|apple gift|amazon.?karte|bitcoin|krypto|western union|moneygram/i)[0];
  if (gift) warnings.push({ label: "Payment by gift card, voucher, crypto or money-transfer service — German authorities never ask for this. Very likely a scam.", sentence: gift });
  const ibans = [...text.matchAll(/\b([A-Z]{2})\d{2}(?:\s?[A-Z0-9]{4}){3,7}/g)].map((m) => m[1]);
  if (ibans.length && ibans.some((cc) => cc !== "DE") && types.some((t) => ["rundfunk", "immigration", "registration", "tax", "fine"].includes(t.id)))
    warnings.push({ label: "A German authority asks you to pay into a foreign bank account. Check the account on the authority's official website before paying." });
  const threat = find(/haftbefehl|festnahme|verhaftung|polizei wird|abschiebung innerhalb von 24/i)[0];
  if (threat && actions.some((a) => a.id === "pay")) warnings.push({ label: "Threats of arrest combined with a payment demand are a common scam pattern. Verify by calling the authority using a number from its official website.", sentence: threat });
  if (types.some((t) => t.id === "debt") && !references.length)
    warnings.push({ label: "A payment demand without a clear reference to an original contract or invoice. Ask for proof of the claim before paying." });

  return {
    types,
    deadlines,
    relativeDeadlines,
    appointments,
    amounts,
    references,
    actions,
    hasObjectionInfo: /rechtsbehelfsbelehrung|rechtsmittelbelehrung|widerspruch/i.test(text),
    warnings,
    terms: termsIn(text),
  };
}

/** Normalises text for "does this quote really appear in the letter?" checks (used by the AI guard). */
export const normaliseForMatch = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß€]+/g, " ").trim();
