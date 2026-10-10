// Search must find the same courses however a student spells a German place.   npm run test:search
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fold, matcher } from "../src/lib/search.ts";

const { programmes } = JSON.parse(readFileSync(join(import.meta.dirname, "..", "data", "programmes.json"), "utf-8")) as {
  programmes: { name: string; university: string; city: string; subject: string; state: string }[];
};
const count = (q: string) => {
  const m = matcher(q);
  return programmes.filter((p) => m(`${p.name} ${p.university} ${p.city} ${p.subject} ${p.state}`)).length;
};
let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.error(msg);
};
const same = (label: string, queries: string[]) => {
  const counts = queries.map(count);
  if (new Set(counts).size !== 1 || counts[0] === 0) {
    failures++;
    console.error(`✗ ${label}: ${queries.map((q, i) => `${q}=${counts[i]}`).join(", ")}`);
  }
};
same("Munich", ["München", "munchen", "muenchen", "Munich", "MUNICH"]);
same("Cologne", ["Köln", "koln", "koeln", "Cologne"]);
same("Nuremberg", ["Nürnberg", "nurnberg", "Nuremberg"]);
same("Hanover", ["Hannover", "Hanover"]);
same("Bavaria", ["Bayern", "Bavaria"]);
same("Düsseldorf", ["Düsseldorf", "dusseldorf", "duesseldorf"]);
same("Gießen", ["Gießen", "giessen", "Giessen"]);
if (count("data science") === 0) fail("✗ plain search broken");
if (count("zzzxqv") !== 0) fail("✗ nonsense query matched");
if (fold("Ärzte Übung Öl") !== "arzte ubung ol") fail("✗ fold");
// dMAT checker: degree names as Indian students write them must reach the right entry of the official list.
const { searchFields } = await import("../src/content/dmat-fields.ts");
const first = (q: string) => searchFields(q)[0];
const dmat: [string, string, RegExp][] = [
  ["computer science engg", "engineering", /Computer Science (and )?Engineering/],
  ["B.Tech CSE", "engineering", /^Computer Science and Engineering$/],
  ["BTech CSE", "engineering", /^Computer Science and Engineering$/],
  ["BE Civil", "engineering", /^Civil Engineering$/],
  ["Bachelor of Engineering in Electronics and Communication", "engineering", /Electronics and Communication Engineering/],
  ["B.Com Finance", "commerce", /B\.Com Finance/],
  ["BCA", "not-included", /BCA/],
  ["B.Sc IT", "not-included", /B\.Sc\. Information Technology/],
  ["B.Sc Data Science", "not-included", /B\.Sc\. Data Science/],
];
for (const [q, group, item] of dmat) {
  const r = first(q);
  if (!r || r.group !== group || !item.test(r.item)) fail(`✗ dMAT "${q}": got ${r ? `${r.group}: ${r.item}` : "nothing"}`);
}
if (searchFields("Physics").length !== 0) fail("✗ dMAT: a field outside the official list must return nothing (no guessing)");
if (failures) process.exit(1);
console.log("✓ search finds the same courses for English, German and umlaut-free spellings; dMAT degree names match the official list");
