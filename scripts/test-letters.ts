// Regression tests for the letter explainer (fictional sample letters + tricky cases).
//   npm run test:letters
import { analyzeLetter } from "../src/lib/letters/analyze.ts";
import { SAMPLE_LETTERS } from "../src/lib/letters/samples.ts";
import { unsupportedTokens } from "../src/lib/guard.ts";

let failures = 0;
const expect = (cond: boolean, msg: string) => {
  if (!cond) {
    failures++;
    console.error("✗", msg);
  }
};
const sample = (id: string) => analyzeLetter(SAMPLE_LETTERS.find((s) => s.id === id)!.text);

const imm = sample("immigration");
expect(imm.types[0]?.id === "immigration", "immigration letter recognised");
expect(imm.deadlines.map((d) => d.text).includes("20.10.2026"), "document deadline found");
expect(imm.appointments.map((d) => d.text).includes("27.10.2026"), "appointment found");
expect(!imm.deadlines.some((d) => d.text === "27.10.2026"), "appointment not mistaken for a deadline");
expect(!imm.deadlines.some((d) => d.text === "02.10.2026"), "letter date not mistaken for a deadline");
expect(imm.references.some((r) => r.value === "AB-2026/4711"), "file reference found");
expect(imm.actions.some((a) => a.id === "documents") && imm.actions.some((a) => a.id === "appointment"), "actions found");
expect(imm.warnings.length === 0, "no scam warnings on a normal letter");

const rf = sample("rundfunk");
expect(rf.types.length === 1 && rf.types[0].id === "rundfunk", "broadcasting fee recognised, not registration");
expect(rf.amounts.some((a) => a.text === "55,08 Euro"), "amount found");
expect(rf.references.some((r) => r.label === "Beitragsnummer"), "contribution number found");

const scam = sample("scam");
expect(scam.warnings.length >= 2, "scam letter raises warnings");
expect(scam.relativeDeadlines.some((d) => /24 stunden/i.test(d.text)), "24-hour pressure detected");

const objection = analyzeLetter("Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden. Rechtsbehelfsbelehrung folgt.");
expect(objection.hasObjectionInfo, "objection information detected");
expect(objection.relativeDeadlines.length === 1, "relative deadline 'innerhalb eines Monats' detected");

const monthName = analyzeLetter("Bitte zahlen Sie den Betrag bis zum 15. November 2026.");
expect(monthName.deadlines.some((d) => /15\. November 2026/.test(d.text)), "written-out German date detected");

// AI guard: allowed vs. invented facts
const letter = "Bitte überweisen Sie den Betrag von 55,08 Euro bis zum 15.11.2026.";
expect(unsupportedTokens("Pay €55.08 by 15 November 2026.", letter).length === 0, "guard accepts correct restatement");
expect(unsupportedTokens("Pay €58.50 by 30 November 2026.", letter).length > 0, "guard rejects invented amount/date");

if (failures) {
  console.error(`✗ ${failures} letter test(s) failed`);
  process.exit(1);
}
console.log("✓ letter explainer tests passed");
