// Downloads the official list of German higher-education institutions from the
// German Rectors' Conference (HRK) "Hochschulkompass" and keeps the fields we need.
// Source page: https://www.hochschulkompass.de/hochschulen/downloads.html
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAW, OUT, USER_AGENT, ensureDir, writeJson, registrableDomain } from "./lib.ts";

const SOURCE_URL = "https://hs-kompass.de/kompass/xml/download/hs_liste.txt";

export type Institution = {
  hrkId: string;
  shortName: string;
  name: string;
  displayName: string;
  type: string; // Universitäten, Fachhochschulen / HAW, Kunst- und Musikhochschulen, ...
  sponsorship: string; // Trägerschaft: öffentlich-rechtlich | privat, staatlich anerkannt | kirchlich, staatlich anerkannt
  isPublic: boolean;
  state: string;
  students: number | null;
  founded: number | null;
  phdRights: boolean;
  city: string;
  homepage: string;
  domain: string | null;
};

async function main() {
  ensureDir(RAW);
  const res = await fetch(SOURCE_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HRK download failed: HTTP ${res.status}`);
  // The file is Latin-1 encoded.
  const buf = Buffer.from(await res.arrayBuffer());
  const rawPath = join(RAW, "hrk_hs_liste.txt");
  writeFileSync(rawPath, buf);
  const text = new TextDecoder("latin1").decode(buf);

  const rows = parseTsv(text);
  const header = rows[0].map((h) => h.trim());
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Column "${name}" missing — HRK changed the file format, check ${rawPath}`);
    return i;
  };
  const c = {
    id: col("Hs-Nr."),
    short: col("Hochschulkurzname"),
    name: col("Hochschulname"),
    display: col("Adressname der Hochschule"),
    type: col("Hochschultyp"),
    sponsor: col("Trägerschaft"),
    state: col("Bundesland"),
    students: col("Anzahl Studierende"),
    founded: col("Gründungsjahr"),
    phd: col("Promotionsrecht"),
    city: col("Ort (Hausanschrift)"),
    home: col("Home Page"),
  };

  const num = (s: string) => (s && /^\d+$/.test(s.trim()) ? Number(s.trim()) : null);
  const institutions: Institution[] = rows.slice(1).map((row) => {
    const f = row.map((x) => x.replace(/\s+/g, " ").trim());
    const sponsorship = f[c.sponsor];
    return {
      hrkId: f[c.id],
      shortName: f[c.short],
      name: f[c.name],
      displayName: f[c.display] || f[c.name],
      type: f[c.type],
      sponsorship,
      // Only "öffentlich-rechtlich" (public law) institutions count as public universities.
      isPublic: sponsorship === "öffentlich-rechtlich",
      state: f[c.state],
      students: num(f[c.students]),
      founded: num(f[c.founded]),
      phdRights: f[c.phd] === "Ja",
      city: f[c.city],
      homepage: f[c.home],
      domain: registrableDomain(f[c.home]),
    };
  });

  const known = ["öffentlich-rechtlich", "privat, staatlich anerkannt", "kirchlich, staatlich anerkannt"];
  const odd = institutions.filter((i) => !known.includes(i.sponsorship));
  if (odd.length) throw new Error(`Unexpected Trägerschaft values: ${JSON.stringify(odd.map((i) => [i.name, i.sponsorship]))}`);

  const sponsorships = new Map<string, number>();
  for (const i of institutions) sponsorships.set(i.sponsorship, (sponsorships.get(i.sponsorship) ?? 0) + 1);

  writeJson(join(OUT, "institutions.json"), {
    source: { name: "Hochschulkompass (HRK)", url: SOURCE_URL, fetchedAt: new Date().toISOString() },
    institutions,
  });
  console.log(`Saved ${institutions.length} institutions.`, Object.fromEntries(sponsorships));
}

/** Tab-separated values where a field may be wrapped in double quotes and contain newlines. */
function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === "\t") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
