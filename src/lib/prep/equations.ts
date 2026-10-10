// Mathematical Equations — original items following the official task rules (g.a.s.t. preparation materials, 02.09.2026):
// a system of equations, each letter is an integer from 1 to 20, and there is exactly one solution.
// Every generated system is checked by brute force over 1..20 for uniqueness before it is used.
import { rng, type Rng } from "./random.ts";

export type EquationItem = {
  kind: "equations";
  seed: number;
  level: 1 | 2 | 3;
  letters: string[];
  equations: string[];
  solution: Record<string, number>;
  explanation: string[];
};

const LETTERS = ["A", "B", "C", "D"];
type Vals = Record<string, number>;
type Eq = { text: string; holds: (v: Vals) => boolean; explain: string };

// Equation templates over 1–2 letters. Each returns null if it can't produce an integer-valid equation for these values.
function relation(r: Rng, x: string, y: string, v: Vals): Eq | null {
  const X = v[x];
  const Y = v[y];
  const options: (() => Eq | null)[] = [
    () => (Y > X ? { text: `${x} + ${Y - X} = ${y}`, holds: (s) => s[x] + (Y - X) === s[y], explain: `${y} is ${Y - X} more than ${x}` } : null),
    () => (X > Y ? { text: `${x} – ${X - Y} = ${y}`, holds: (s) => s[x] - (X - Y) === s[y], explain: `${y} is ${X - Y} less than ${x}` } : null),
    () => (Y % X === 0 && Y / X > 1 ? { text: `${Y / X} × ${x} = ${y}`, holds: (s) => (Y / X) * s[x] === s[y], explain: `${y} is ${Y / X} times ${x}` } : null),
    () => (X % Y === 0 && X / Y > 1 ? { text: `${x} ÷ ${X / Y} = ${y}`, holds: (s) => s[x] === (X / Y) * s[y], explain: `${x} is ${X / Y} times ${y}` } : null),
    () => ({ text: `${x} + ${y} = ${X + Y}`, holds: (s) => s[x] + s[y] === X + Y, explain: `${x} and ${y} add up to ${X + Y}` }),
    () => (X > Y ? { text: `${x} – ${y} = ${X - Y}`, holds: (s) => s[x] - s[y] === X - Y, explain: `${x} is ${X - Y} more than ${y}` } : null),
    () => (X * Y <= 60 ? { text: `${x} × ${y} = ${X * Y}`, holds: (s) => s[x] * s[y] === X * Y, explain: `${x} times ${y} is ${X * Y}` } : null),
  ];
  for (const f of r.shuffle(options)) {
    const e = f();
    if (e) return e;
  }
  return null;
}

function anchor(r: Rng, x: string, v: Vals): Eq {
  const X = v[x];
  const k = r.int(1, 12);
  return r.pick([
    { text: `${x} = ${X}`, holds: (s: Vals) => s[x] === X, explain: `${x} is given directly` },
    { text: `${k} + ${x} = ${X + k}`, holds: (s: Vals) => k + s[x] === X + k, explain: `${x} = ${X + k} – ${k} = ${X}` },
    ...(X > k ? [{ text: `${x} – ${k} = ${X - k}`, holds: (s: Vals) => s[x] - k === X - k, explain: `${x} = ${X - k} + ${k} = ${X}` }] : []),
  ]);
}

function threeWay(r: Rng, letters: string[], v: Vals): Eq {
  const [a, b, c] = r.shuffle(letters).slice(0, 3);
  const total = v[a] + v[b] - v[c];
  return { text: `${a} + ${b} – ${c} = ${total}`, holds: (s) => s[a] + s[b] - s[c] === total, explain: `check: ${v[a]} + ${v[b]} – ${v[c]} = ${total}` };
}

function countSolutions(letters: string[], eqs: Eq[], cap = 2): number {
  let found = 0;
  const vals: Vals = {};
  const rec = (i: number): void => {
    if (found >= cap) return;
    if (i === letters.length) {
      if (eqs.every((e) => e.holds(vals))) found++;
      return;
    }
    for (let n = 1; n <= 20; n++) {
      vals[letters[i]] = n;
      rec(i + 1);
    }
  };
  rec(0);
  return found;
}

export function generateEquations(seed: number, level: 1 | 2 | 3): EquationItem {
  const r = rng(seed);
  const n = level + 1; // 2, 3 or 4 letters
  for (let attempt = 0; attempt < 200; attempt++) {
    const letters = LETTERS.slice(0, n);
    const v: Vals = {};
    for (const l of letters) v[l] = r.int(1, 20);
    if (new Set(Object.values(v)).size < n) continue; // distinct values read more cleanly
    const eqs: Eq[] = [];
    const order = r.shuffle(letters);
    // Level 1–2 start from a known letter; level 3 sometimes has no direct anchor (must combine equations).
    if (level < 3 || r.chance(0.5)) eqs.push(anchor(r, order[0], v));
    for (let i = 1; i < order.length; i++) {
      const e = relation(r, order[r.int(0, i - 1)], order[i], v);
      if (e) eqs.push(e);
    }
    if (level === 3) eqs.push(threeWay(r, letters, v));
    while (eqs.length < n) {
      const [x, y] = r.shuffle(letters);
      const e = relation(r, x, y, v);
      if (e) eqs.push(e);
    }
    if (!eqs.every((e) => e.holds(v))) continue;
    if (countSolutions(letters, eqs) !== 1) continue;
    const shown = r.shuffle(eqs);
    return {
      kind: "equations",
      seed,
      level,
      letters,
      equations: shown.map((e) => e.text),
      solution: v,
      explanation: [
        ...shown.map((e) => `${e.text} → ${e.explain}.`),
        `Solution: ${letters.map((l) => `${l} = ${v[l]}`).join(", ")}. Every letter is a whole number from 1 to 20 and this is the only combination that fits all equations.`,
      ],
    };
  }
  throw new Error(`Could not generate an equation system for seed ${seed}`);
}
