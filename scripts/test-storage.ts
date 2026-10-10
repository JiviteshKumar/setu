// Garbage-in tests for data stored on the student's device (localStorage): nothing stored may crash a page.
//   npm run test:storage
import { conform } from "../src/lib/useStoredState.ts";
import { intakeOrNull, oneOf, periods, savedProgrammes, stringList, workEntries } from "../src/lib/storedShapes.ts";

let failures = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failures++;
    console.error(`✗ ${label}\n    got  ${JSON.stringify(got)}\n    want ${JSON.stringify(want)}`);
  }
};
const GARBAGE: unknown[] = [null, 0, 42, -1, NaN, "", "oops", true, [], [1, 2], {}, { a: 1 }, [null], [{}], [{ id: "1" }], { length: 3 }];

// Default shape check
const DEF = { type: "werkstudent", field: "Informatik", city: "" };
for (const g of GARBAGE) {
  const v = conform(g, DEF);
  eq(`object default survives ${JSON.stringify(g)}`, typeof v.type === "string" && typeof v.field === "string" && typeof v.city === "string", true);
  eq(`array default survives ${JSON.stringify(g)}`, Array.isArray(conform(g, [])), true);
  eq(`string default survives ${JSON.stringify(g)}`, typeof conform(g, "x"), "string");
  eq(`boolean default survives ${JSON.stringify(g)}`, typeof conform(g, false), "boolean");
}
eq("valid object kept", conform({ type: "minijob", field: "Data", city: "Köln" }, DEF), { type: "minijob", field: "Data", city: "Köln" });
eq("wrong field type reset", conform({ type: 5, field: "Data" }, DEF), { type: "werkstudent", field: "Data", city: "" });
eq("nested object conformed", conform({ ratings: { figures: "x", latin: 1300 }, history: "no" }, { ratings: { figures: 1200, latin: 1200 }, history: [] }), {
  ratings: { figures: 1200, latin: 1300 },
  history: [],
});

// Specific checks
for (const g of GARBAGE) {
  eq(`saved courses from ${JSON.stringify(g)}`, Array.isArray(savedProgrammes(g)), true);
  eq(`string list from ${JSON.stringify(g)}`, stringList(g).every((x) => typeof x === "string"), true);
  eq(`intake from ${JSON.stringify(g)}`, intakeOrNull(g), null);
  eq(`work entries from ${JSON.stringify(g)}`, workEntries(g), []);
  eq(`periods from ${JSON.stringify(g)}`, periods(g), []);
}
const saved = savedProgrammes([
  { id: 4722, name: "Actuarial", university: "RPTU", city: "Kaiserslautern", status: "applied", steps: { req: true, x: "yes" }, note: "n", savedAt: "2026-10-01T00:00:00Z", deadline: "07-15", deadlines: [{ intake: "winter", from: null, until: "07-15" }, { intake: "spring", until: "x" }] },
  { id: 4722, name: "duplicate" },
  { id: "5", name: "string id" },
  { id: 9, name: "minimal" },
  "junk",
]);
eq("saved: valid kept, duplicate/invalid dropped", saved.map((s) => s.id), [4722, 9]);
eq("saved: bad step values dropped", saved[0].steps, { req: true });
eq("saved: bad deadline entries dropped", saved[0].deadlines, [{ intake: "winter", from: null, until: "07-15" }]);
eq("saved: minimal entry repaired", { status: saved[1].status, note: saved[1].note, intake: saved[1].intake, steps: saved[1].steps }, { status: "researching", note: "", intake: null, steps: {} });
eq("intake valid", intakeOrNull({ season: "winter", year: 2027 }), { season: "winter", year: 2027 });
eq("intake bad year", intakeOrNull({ season: "winter", year: 99999 }), null);
eq("intake bad season", intakeOrNull({ season: "spring", year: 2027 }), null);
eq("enum valid", oneOf(["auto", "on", "off"] as const, "auto")("off"), "off");
eq("enum invalid", oneOf(["auto", "on", "off"] as const, "auto")({ weird: true }), "auto");
eq("work entries filtered", workEntries([{ date: "2026-10-01", hours: 8, studentAssistant: false }, { date: "2026-13-45", hours: 8 }, { date: "2026-10-02", hours: 99 }, { date: "2026-10-03", hours: -1 }]).length, 1);
eq("periods filtered", periods([{ from: "2026-10-01", to: "2027-02-01" }, { from: "2027-02-01", to: "2026-10-01" }, { from: "x", to: "y" }]).length, 1);

if (failures) {
  console.error(`✗ ${failures} storage test(s) failed`);
  process.exit(1);
}
console.log("✓ stored data: every garbage value falls back safely, valid data is kept");
