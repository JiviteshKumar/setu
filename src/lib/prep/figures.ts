// Figure Sequences — original items following the official task rules (g.a.s.t. preparation materials, 02.09.2026):
// figures in a matrix change position, colour and/or orientation by fixed rules; find the next two matrices.
// Rules implemented exactly as published: figures can change colour, rotate around their own axis, and move
// horizontally, vertically or diagonally (never switching between diagonal and other movement); changes can grow
// by one each time (1 step, 2 steps, 3 steps …); figures never disappear or overlap and never leave the matrix —
// at the edge they either bounce off or move along the outer boundary.
// The sequence is produced by simulating these rules, so the correct answer is right by construction.
import { rng, type Rng } from "./random.ts";

export const SIZE = 4;
export const COLORS = ["#2563eb", "#e07a1f", "#16a34a", "#9333ea"]; // blue, saffron, green, purple
export const COLOR_NAMES = ["blue", "orange", "green", "purple"];
export type Shape = "triangle" | "arrow" | "half" | "circle" | "square";
const ROTATING: Shape[] = ["triangle", "arrow", "half"];

export type FigureState = { shape: Shape; color: number; rot: number; r: number; c: number };
export type Frame = FigureState[];

type Move =
  | { type: "none" }
  | { type: "edge"; dir: 1 | -1 } // along the outer boundary (12 fields)
  | { type: "line"; dr: number; dc: number }; // straight line, bouncing off the edges

type Rule = {
  shape: Shape;
  start: { color: number; rot: number; r: number; c: number };
  move: Move;
  step: number; // fields per frame at the start
  colorStep: number; // 0 = colour stays
  rotStep: number; // quarter turns per frame, 0 = no rotation, +1 clockwise, -1 anticlockwise
  grow: boolean; // movement grows by one each frame (1, 2, 3 …)
};

export type FigureItem = {
  kind: "figures";
  seed: number;
  level: 1 | 2 | 3;
  frames: Frame[]; // the 4 matrices shown
  questions: { options: Frame[]; answer: number }[]; // matrix 5 and matrix 6
  explanation: string[];
};

// Outer ring of a 4×4 grid, clockwise from the top-left corner.
const EDGE: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, 0], [1, 0],
];

const reflect = (p: number) => {
  const period = 2 * (SIZE - 1);
  const m = ((p % period) + period) % period;
  return m <= SIZE - 1 ? m : period - m;
};

/** Distance travelled after t frames: constant steps, or 1-2-3… style growth starting from `step`. */
const distance = (rule: Rule, t: number) => (rule.grow ? rule.step * t + (t * (t - 1)) / 2 : rule.step * t);

function stateAt(rule: Rule, t: number, override?: Partial<{ dist: number; color: number; rot: number }>): FigureState {
  const d = override?.dist ?? distance(rule, t);
  let r = rule.start.r;
  let c = rule.start.c;
  if (rule.move.type === "edge") {
    const i0 = EDGE.findIndex(([er, ec]) => er === r && ec === c);
    [r, c] = EDGE[(((i0 + rule.move.dir * d) % 12) + 12) % 12];
  } else if (rule.move.type === "line") {
    r = reflect(r + rule.move.dr * d);
    c = reflect(c + rule.move.dc * d);
  }
  const colorSteps = rule.grow && rule.colorStep ? distance({ ...rule, step: 1 }, t) : rule.colorStep * t;
  const rotSteps = rule.grow && rule.rotStep ? Math.sign(rule.rotStep) * distance({ ...rule, step: 1 }, t) : rule.rotStep * t;
  return {
    shape: rule.shape,
    color: override?.color ?? (((rule.start.color + colorSteps) % 4) + 4) % 4,
    rot: override?.rot ?? (((rule.start.rot + rotSteps) % 4) + 4) % 4,
    r,
    c,
  };
}

const key = (f: Frame) =>
  f
    .map((s) => `${s.shape}${s.color}${s.rot}${s.r}${s.c}`)
    .sort()
    .join("|");
const overlaps = (f: Frame) => new Set(f.map((s) => `${s.r},${s.c}`)).size !== f.length;

function makeRule(r: Rng, shape: Shape, level: number, wantsMove: boolean): Rule {
  const rotates = ROTATING.includes(shape);
  const onEdge = r.chance(0.5);
  let move: Move = { type: "none" };
  let start = { r: r.int(0, 3), c: r.int(0, 3) };
  if (wantsMove) {
    if (onEdge) {
      const [er, ec] = r.pick(EDGE);
      start = { r: er, c: ec };
      move = { type: "edge", dir: r.pick([1, -1] as const) };
    } else {
      const dirs = level === 1 ? [[0, 1], [1, 0], [0, -1], [-1, 0]] : [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      const [dr, dc] = r.pick(dirs);
      move = { type: "line", dr, dc };
    }
  }
  return {
    shape,
    start: { ...start, color: r.int(0, 3), rot: rotates ? r.int(0, 3) : 0 },
    move,
    step: level === 3 && r.chance(0.3) ? 2 : 1,
    colorStep: level >= 2 && r.chance(0.5) ? 1 : 0,
    rotStep: rotates && (level >= 2 || move.type === "none") && r.chance(0.6) ? r.pick([1, -1]) : 0,
    grow: level === 3 && r.chance(0.5),
  };
}

function describe(rule: Rule): string {
  const name = `The ${rule.shape === "half" ? "half circle" : rule.shape} (${COLOR_NAMES[rule.start.color]} in matrix 1)`;
  const parts: string[] = [];
  const steps = rule.grow ? `${rule.step}, then ${rule.step + 1}, then ${rule.step + 2} … field(s)` : `${rule.step} field${rule.step > 1 ? "s" : ""} each time`;
  if (rule.move.type === "edge") parts.push(`moves ${steps} ${rule.move.dir === 1 ? "clockwise" : "anticlockwise"} along the outer boundary`);
  if (rule.move.type === "line") {
    const { dr, dc } = rule.move;
    const dir = dr && dc ? "diagonally" : dr ? (dr > 0 ? "down" : "up") : dc > 0 ? "right" : "left";
    parts.push(`moves ${dir} ${steps} and bounces off the edge`);
  }
  if (rule.rotStep) parts.push(`turns 90° ${rule.rotStep > 0 ? "clockwise" : "anticlockwise"}${rule.grow ? " (1, 2, 3 … quarter turns)" : " each time"}`);
  if (rule.colorStep)
    parts.push(`changes colour along the cycle blue → orange → green → purple${rule.grow ? ", moving on 1, then 2, then 3 … colours" : ", one colour each time"}`);
  if (!parts.length) parts.push("does not change");
  return `${name} ${parts.join(", ")}.`;
}

/** Plausible wrong answers: one figure moved one field too far/short, wrong colour or wrong orientation. */
function distractors(r: Rng, rules: Rule[], t: number, correct: Frame): Frame[] {
  const out: Frame[] = [];
  const seen = new Set([key(correct)]);
  const tweaks = r.shuffle(
    rules.flatMap((rule, i) => [
      { i, o: { dist: distance(rule, t) + 1 } },
      { i, o: { dist: Math.max(0, distance(rule, t) - 1) } },
      { i, o: { dist: distance(rule, t - 1) } },
      { i, o: { color: (stateAt(rule, t).color + 1) % 4 } },
      { i, o: { color: (stateAt(rule, t).color + 3) % 4 } },
      ...(ROTATING.includes(rule.shape) ? [{ i, o: { rot: (stateAt(rule, t).rot + 1) % 4 } }, { i, o: { rot: (stateAt(rule, t).rot + 2) % 4 } }] : []),
    ]),
  );
  for (const tw of tweaks) {
    const f = rules.map((rule, j) => (j === tw.i ? stateAt(rule, t, tw.o) : stateAt(rule, t)));
    if (overlaps(f) || seen.has(key(f))) continue;
    seen.add(key(f));
    out.push(f);
    if (out.length === 3) break;
  }
  return out;
}

/** How much a test taker has to track: moving, growing, diagonal/bouncing, colour and rotation changes. */
export function complexity(rules: Rule[]): number {
  return rules.reduce((sum, x) => {
    let s = 0;
    if (x.move.type !== "none") s += 1;
    if (x.move.type === "line" && x.move.dr && x.move.dc) s += 0.5;
    if (x.move.type !== "none" && x.step > 1) s += 0.5;
    if (x.grow) s += 1;
    if (x.colorStep) s += 1;
    if (x.rotStep) s += 1;
    return sum + s;
  }, 0);
}

export function generateFigures(seed: number, level: 1 | 2 | 3): FigureItem {
  const r = rng(seed);
  for (let attempt = 0; attempt < 300; attempt++) {
    const count = level === 1 ? 1 : level === 2 ? r.int(1, 2) : r.int(2, 3);
    const shapes = r.shuffle<Shape>(["triangle", "arrow", "half", "circle", "square"]).slice(0, count);
    const rules = shapes.map((s, i) => makeRule(r, s, level, i === 0 || r.chance(0.6)));
    // Each level needs a minimum amount of change to track: easy = one simple rule, hard = several rules incl. growth.
    const score = complexity(rules);
    if (level === 1 ? score > 1.5 : level === 2 ? score < 2 || score > 3.5 : score < 3.5 || !rules.some((x) => x.grow || x.move.type === "line")) continue;
    const all = [0, 1, 2, 3, 4, 5].map((t) => rules.map((rule) => stateAt(rule, t)));
    if (all.some(overlaps)) continue;
    if (new Set(all.slice(0, 5).map(key)).size < 5) continue; // something must visibly change every time
    const questions = [4, 5].map((t) => {
      const correct = all[t];
      const wrong = distractors(r, rules, t, correct);
      const options = r.shuffle([correct, ...wrong]);
      return { options, answer: options.indexOf(correct) };
    });
    if (questions.some((q) => q.options.length < 4)) continue;
    return {
      kind: "figures",
      seed,
      level,
      frames: all.slice(0, 4),
      questions,
      explanation: rules.map(describe),
    };
  }
  throw new Error(`Could not generate a figure sequence for seed ${seed}`);
}
