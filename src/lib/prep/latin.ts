// Latin Squares — original items following the official task rules (g.a.s.t. preparation materials, 02.09.2026):
// a 5×5 grid, each letter appears once per row and column; find the letter for the "?".
// Difficulty = how many other cells you must fill in your head first. Every item is checked by a solver:
// the "?" must follow by pure elimination ("only one letter left for this cell"), with exactly that many steps.
import { rng } from "./random.ts";

export const SYMBOLS = ["A", "B", "C", "D", "E"] as const;
export type Cell = string | null;

export type LatinItem = {
  kind: "latin";
  seed: number;
  level: 1 | 2 | 3;
  grid: Cell[][]; // null = empty; the target cell is null too
  target: [number, number];
  answer: string;
  explanation: string[];
};

function candidates(g: Cell[][], r: number, c: number): string[] {
  const used = new Set<string>();
  for (let i = 0; i < 5; i++) {
    if (g[r][i]) used.add(g[r][i]!);
    if (g[i][c]) used.add(g[i][c]!);
  }
  return SYMBOLS.filter((s) => !used.has(s));
}

/** Fill cells that have exactly one candidate, round by round, until the target is known. Returns the steps or null. */
export function solveSteps(grid: Cell[][], target: [number, number]): { steps: { r: number; c: number; v: string }[]; value: string } | null {
  const g = grid.map((row) => [...row]);
  const steps: { r: number; c: number; v: string }[] = [];
  for (let round = 0; round < 25; round++) {
    const t = candidates(g, target[0], target[1]);
    if (t.length === 1) return { steps, value: t[0] };
    let progress = false;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] || (r === target[0] && c === target[1])) continue;
        const cand = candidates(g, r, c);
        if (cand.length === 1) {
          g[r][c] = cand[0];
          steps.push({ r, c, v: cand[0] });
          progress = true;
        }
      }
    }
    if (!progress) return null;
  }
  return null;
}

/** Fewest helper cells actually needed: replays the elimination and keeps only cells the target depends on. */
function neededSteps(grid: Cell[][], target: [number, number]) {
  const res = solveSteps(grid, target);
  if (!res) return null;
  // Greedy pruning: drop a step if every remaining step is still forced in order and the target is still forced.
  const valid = (trial: typeof res.steps) => {
    const g = grid.map((row) => [...row]);
    for (const s of trial) {
      const cand = candidates(g, s.r, s.c);
      if (cand.length !== 1 || cand[0] !== s.v) return false;
      g[s.r][s.c] = s.v;
    }
    return candidates(g, target[0], target[1]).length === 1;
  };
  let steps = res.steps;
  for (let i = steps.length - 1; i >= 0; i--) {
    const trial = steps.filter((_, j) => j !== i);
    if (valid(trial)) steps = trial;
  }
  return { steps, value: res.value };
}

export function generateLatin(seed: number, level: 1 | 2 | 3): LatinItem {
  const r = rng(seed);
  for (let attempt = 0; attempt < 400; attempt++) {
    // Random Latin square: shuffle rows, columns and symbols of a cyclic square.
    const rows = r.shuffle([0, 1, 2, 3, 4]);
    const cols = r.shuffle([0, 1, 2, 3, 4]);
    const syms = r.shuffle(SYMBOLS);
    const full: string[][] = rows.map((i) => cols.map((j) => syms[(i + j) % 5]));
    const target: [number, number] = [r.int(0, 4), r.int(0, 4)];
    const grid: Cell[][] = full.map((row) => [...row]);
    grid[target[0]][target[1]] = null;

    // Remove cells while the target stays forced; stop once the required number of steps is reached.
    const want = level - 1; // 0, 1 or 2+ helper cells
    for (const idx of r.shuffle([...Array(25).keys()])) {
      const rr = Math.floor(idx / 5);
      const cc = idx % 5;
      if ((rr === target[0] && cc === target[1]) || !grid[rr][cc]) continue;
      const keep = grid[rr][cc];
      grid[rr][cc] = null;
      const s = neededSteps(grid, target);
      if (!s) {
        grid[rr][cc] = keep; // removing this cell would make the "?" unsolvable
        continue;
      }
      const filled = grid.flat().filter(Boolean).length;
      if (s.steps.length >= want && filled <= (level === 1 ? 16 : level === 2 ? 14 : 12)) break;
    }
    const final = neededSteps(grid, target);
    if (!final || final.value !== full[target[0]][target[1]]) continue;
    const ok = level === 3 ? final.steps.length >= 2 : final.steps.length === level - 1;
    if (!ok) continue;
    const name = (p: { r: number; c: number }) => `row ${p.r + 1}, column ${p.c + 1}`;
    return {
      kind: "latin",
      seed,
      level,
      grid,
      target,
      answer: final.value,
      explanation: [
        ...final.steps.map((s) => `First fill ${name(s)}: only ${s.v} is missing from that row and column.`),
        `Now the "?" (${name({ r: target[0], c: target[1] })}) can only be ${final.value}: every other letter already appears in its row or column.`,
      ],
    };
  }
  throw new Error(`Could not generate a Latin square for seed ${seed}`);
}
