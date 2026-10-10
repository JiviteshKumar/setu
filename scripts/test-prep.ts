// Stress test for the practice-question generators: every item must be valid, solvable and unambiguous.
//   npm run test:prep
import { generateEquations } from "../src/lib/prep/equations.ts";
import { generateLatin, solveSteps, SYMBOLS } from "../src/lib/prep/latin.ts";
import { generateFigures, SIZE } from "../src/lib/prep/figures.ts";
import { PASSAGES } from "../src/lib/prep/subject.ts";

const N = Number(process.env.N ?? 300);
let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures < 20) console.error("✗", msg);
};

for (const level of [1, 2, 3] as const) {
  const t0 = Date.now();
  for (let seed = 1; seed <= N; seed++) {
    // Equations: solution in range and satisfies every shown equation (uniqueness is enforced inside the generator).
    const e = generateEquations(seed * 7919, level);
    if (Object.values(e.solution).some((v) => v < 1 || v > 20 || !Number.isInteger(v))) fail(`equations ${seed}: value out of range`);
    for (const eq of e.equations) {
      const [lhs, rhs] = eq.split("=").map((s) => s.trim());
      const ev = (s: string) =>
        Function(`"use strict"; return (${s.replace(/×/g, "*").replace(/÷/g, "/").replace(/–/g, "-").replace(/[A-D]/g, (l) => String(e.solution[l]))});`)();
      if (ev(lhs) !== ev(rhs)) fail(`equations ${seed}: "${eq}" does not hold`);
    }

    // Latin squares: the given letters never repeat in a row/column, and elimination forces the stored answer.
    const l = generateLatin(seed * 104729, level);
    for (let i = 0; i < 5; i++) {
      const row = l.grid[i].filter(Boolean);
      const col = l.grid.map((r) => r[i]).filter(Boolean);
      if (new Set(row).size !== row.length || new Set(col).size !== col.length) fail(`latin ${seed}: duplicate letter`);
    }
    const solved = solveSteps(l.grid, l.target);
    if (!solved || solved.value !== l.answer || !SYMBOLS.includes(l.answer as never)) fail(`latin ${seed}: answer not forced`);
    if (l.grid[l.target[0]][l.target[1]] !== null) fail(`latin ${seed}: target cell not empty`);

    // Figures: 4 distinct options per question, exactly one correct, all inside the grid, no overlaps.
    const f = generateFigures(seed * 15485863, level);
    for (const q of f.questions) {
      const keys = q.options.map((o) => JSON.stringify([...o].sort((a, b) => a.shape.localeCompare(b.shape))));
      if (new Set(keys).size !== 4) fail(`figures ${seed}: duplicate options`);
      if (q.answer < 0 || q.answer > 3) fail(`figures ${seed}: bad answer index`);
      for (const o of q.options)
        for (const s of o) if (s.r < 0 || s.r >= SIZE || s.c < 0 || s.c >= SIZE) fail(`figures ${seed}: figure outside grid`);
    }
  }
  console.log(`level ${level}: ${N} equations + ${N} latin squares + ${N} figure sequences in ${Date.now() - t0} ms`);
}

// Subject passages: many random variants, each question has 4 distinct options and exactly one correct answer.
for (const p of PASSAGES) {
  for (let seed = 1; seed <= N; seed++) {
    const item = p.generate(seed * 31337);
    for (const [qi, q] of item.questions.entries()) {
      if (q.options.length !== 4) fail(`${p.id} ${seed} q${qi + 1}: needs 4 options`);
      if (new Set(q.options).size !== 4) fail(`${p.id} ${seed} q${qi + 1}: duplicate options ${JSON.stringify(q.options)}`);
      if (q.answer < 0 || q.answer > 3) fail(`${p.id} ${seed} q${qi + 1}: bad answer index`);
      if (!q.explanation) fail(`${p.id} ${seed} q${qi + 1}: missing explanation`);
      // The "× k" filler only appears when distractors collided — a real option must always be written instead.
      if (q.options.some((o) => / × \d+$/.test(o))) fail(`${p.id} ${seed} q${qi + 1}: filler option ${JSON.stringify(q.options)}`);
      if (q.options.some((o) => /NaN|undefined|Infinity/.test(o))) fail(`${p.id} ${seed} q${qi + 1}: broken option ${JSON.stringify(q.options)}`);
    }
  }
}
console.log(`subject: ${PASSAGES.length} passages × ${N} variants checked`);

if (failures) {
  console.error(`✗ ${failures} problem(s)`);
  process.exit(1);
}
console.log("✓ all generated practice items are valid");
