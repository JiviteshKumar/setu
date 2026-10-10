// Subject Module (General Academic Module) — ORIGINAL practice texts written for Setu.
// Format follows the official description (g.a.s.t. preparation materials, 02.09.2026): a text that explains a concept,
// possibly with formulas and tables, followed by single-choice questions with 4 options and one correct answer.
// Topic areas follow the official list (mathematics, computational sciences, natural sciences, engineering,
// business administration, economics, social sciences, humanities). No official exam questions are used.
// Numbers are randomised per seed and every answer is computed in code; distractors model typical mistakes.
// Numbers are kept mental-maths friendly because calculators and notes are not allowed in the exam.
import { rng, type Rng } from "./random.ts";

export type Block = { type: "p"; text: string } | { type: "formula"; text: string } | { type: "table"; head: string[]; rows: string[][] };
export type SubjectQuestion = { prompt: string; options: string[]; answer: number; explanation: string };
export type SubjectItem = { kind: "subject"; id: string; seed: number; title: string; field: string; text: Block[]; questions: SubjectQuestion[] };
export type Passage = { id: string; title: string; field: string; generate: (seed: number) => SubjectItem };

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 2 }));
const eur = (n: number) => `€${fmt(n)}`;

/** Nearby values in the same format ("€2,000" → "€2,100", "€1,900", …) for when modelled distractors collide. */
function nearby(correct: string): string[] {
  const m = correct.match(/^(.*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return [];
  const [, pre, num, post] = m;
  const n = Number(num.replace(/,/g, ""));
  const decimals = num.split(".")[1]?.length ?? 0;
  const step = decimals ? 10 ** -decimals : Math.max(1, 10 ** (Math.floor(Math.log10(Math.abs(n) || 1)) - 1));
  const out: string[] = [];
  for (const k of [1, -1, 2, -2, 3, -3, 4, 5]) {
    const v = Math.round((n + k * step) * 100) / 100;
    if (n > 0 && v <= 0) continue; // keep positive quantities positive
    out.push(`${pre}${fmt(v)}${post}`);
  }
  return out;
}

/** Builds a question: shuffles the correct answer among the wrong ones (which must all differ from it). */
function q(r: Rng, prompt: string, correct: string, wrong: string[], explanation: string): SubjectQuestion {
  const unique = [...new Set(wrong.filter((w) => w !== correct))].slice(0, 3);
  // Modelled mistakes sometimes coincide for particular numbers; fill up with nearby values instead.
  for (const alt of nearby(correct)) {
    if (unique.length >= 3) break;
    if (alt !== correct && !unique.includes(alt)) unique.push(alt);
  }
  if (unique.length < 3) throw new Error(`Not enough distinct options for "${prompt}"`);
  const options = r.shuffle([correct, ...unique]);
  return { prompt, options, answer: options.indexOf(correct), explanation };
}

const P = (text: string): Block => ({ type: "p", text });
const F = (text: string): Block => ({ type: "formula", text });

export const PASSAGES: Passage[] = [
  {
    id: "compound-growth",
    title: "Compound growth",
    field: "Mathematics / finance",
    generate(seed) {
      const r = rng(seed);
      const P0 = r.pick([1000, 2000, 5000]);
      const rate = r.pick([10, 20]);
      const g = 1 + rate / 100;
      const a2 = P0 * g * g;
      const R = r.pick([4, 6, 8, 9, 12]);
      const x = r.pick([1000, 2000, 4000]);
      const rate2 = r.pick([5, 10, 25]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("When interest is added to a balance and itself earns interest in the following years, the balance grows by compound growth. With a starting amount P and an annual rate r (written as a decimal), the balance after t years is:"),
          F("A(t) = P · (1 + r)^t"),
          P("With simple interest, by contrast, interest is only paid on the starting amount: A(t) = P · (1 + r·t). For small rates both formulas give similar results over short periods, but compound growth pulls ahead over time."),
          P("A quick estimate for the doubling time of a compounding balance is the 'rule of 72': at an annual rate of R percent, a balance doubles after roughly 72 ÷ R years."),
        ],
        questions: [
          q(r, `A balance of ${eur(P0)} earns ${rate}% compound interest per year. What is the balance after 2 years?`, eur(a2), [eur(P0 * (1 + (2 * rate) / 100)), eur(P0 * g), eur(P0 * g * g * g)], `A(2) = ${fmt(P0)} · ${g}² = ${fmt(P0)} · ${fmt(g * g)} = ${fmt(a2)}.`),
          q(r, `Using the rule of 72, roughly how long does a balance take to double at ${R}% per year?`, `${fmt(72 / R)} years`, [`${fmt(Math.round((100 / R) * 10) / 10)} years`, `${fmt(2 * R)} years`, `${fmt(72 * R)} years`], `72 ÷ ${R} = ${fmt(72 / R)}.`),
          q(r, "If the starting amount were twice as large (same rate, same time), the final balance would be …", "twice as large", ["four times as large", "the same", "larger by the factor (1 + r)"], "A(t) is proportional to P: doubling P doubles A(t)."),
          q(r, `For ${eur(P0)} at ${rate}% over 2 years, how much more does compound interest pay than simple interest?`, eur(P0 * (rate / 100) ** 2), [eur((P0 * rate) / 100), eur(0), eur(2 * P0 * (rate / 100) ** 2)], `Compound: ${fmt(a2)}; simple: ${fmt(P0 * (1 + (2 * rate) / 100))}. Difference = P · r² = ${fmt(P0 * (rate / 100) ** 2)}.`),
          q(r, `A balance grows from ${eur(x)} to ${eur(x * (1 + rate2 / 100))} in one year. What is the annual rate?`, `${rate2}%`, [`${rate2 * 2}%`, `${rate2 / 5}%`, `${100 + rate2}%`], `Growth ${fmt((x * rate2) / 100)} ÷ ${fmt(x)} = ${rate2 / 100} = ${rate2}%.`),
          q(r, "Which statement describes compound growth correctly?", "Interest earned in earlier years also earns interest later.", ["Interest is only ever paid on the starting amount.", "The balance grows by the same amount every year.", "The rule of 72 gives the exact doubling time."], "That is the defining feature of compounding; the rule of 72 is only an estimate."),
        ],
      };
    },
  },
  {
    id: "binary-search",
    title: "Searching a sorted list",
    field: "Computational sciences",
    generate(seed) {
      const r = rng(seed);
      const n = r.pick([100, 500, 1000, 4000, 30000]);
      const steps = Math.floor(Math.log2(n)) + 1;
      const k = r.pick([5, 6, 7, 8]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("Linear search checks the elements of a list one after another until it finds the target. In the worst case it must look at every element, so the number of comparisons grows in proportion to the length n of the list."),
          P("Binary search only works on a sorted list. It compares the target with the middle element; depending on the result it discards the lower or upper half and repeats on the remaining half. Because the search range is halved each time, the maximum number of comparisons is:"),
          F("comparisons(max) = ⌊log₂ n⌋ + 1"),
          { type: "table", head: ["List length n", "Max. comparisons (binary)"], rows: [["8", "4"], ["16", "5"], ["1,024", "11"], ["1,000,000", "20"]] },
        ],
        questions: [
          q(r, `What is the maximum number of comparisons binary search needs for a sorted list of ${fmt(n)} elements?`, fmt(steps), [fmt(steps + 1), fmt(steps - 1), fmt(n / 2)], `2^${steps - 1} = ${fmt(2 ** (steps - 1))} ≤ ${fmt(n)} < 2^${steps}, so ⌊log₂ ${fmt(n)}⌋ + 1 = ${steps}.`),
          q(r, "The length of a sorted list doubles. How does the maximum number of binary-search comparisons change?", "It increases by 1", ["It doubles", "It increases by 2", "It stays the same"], "One extra halving step covers twice as many elements."),
          q(r, `In the worst case, how many comparisons does linear search need for ${fmt(n)} elements?`, fmt(n), [fmt(n / 2), fmt(steps), "1"], "In the worst case every element is checked."),
          q(r, "Which condition must hold before binary search can be used?", "The list must be sorted.", ["The list length must be a power of two.", "The list must contain only numbers.", "The target must be in the middle."], "Discarding half of the list is only safe if the order is known."),
          q(r, `What is the largest list length for which binary search needs at most ${k} comparisons?`, fmt(2 ** k - 1), [fmt(2 ** k), fmt(2 ** (k - 1)), fmt(2 * k)], `With ${k} comparisons you can cover up to 2^${k} – 1 = ${fmt(2 ** k - 1)} elements.`),
          q(r, "For 1,000,000 sorted elements, roughly how many comparisons does binary search need at most?", "20", ["1,000", "500,000", "6"], "2^20 ≈ 1,048,576, so about 20 comparisons — see the table."),
        ],
      };
    },
  },
  {
    id: "half-life",
    title: "Radioactive decay",
    field: "Natural sciences",
    generate(seed) {
      const r = rng(seed);
      const T = r.pick([2, 5, 8]);
      const N0 = r.pick([800, 1600, 3200]);
      const h = r.pick([2, 3, 4]);
      const c0 = r.pick([6400, 3200]);
      const a = r.pick([3, 6, 10]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("Radioactive nuclei decay at random, but a large sample follows a simple law: after a fixed time, the half-life T, half of the nuclei that were present have decayed. After two half-lives a quarter remains, after three an eighth, and so on:"),
          F("N(t) = N₀ · (1/2)^(t / T)"),
          P("The half-life is a property of the isotope. It does not depend on how much material there is. A detector that counts decays per hour measures the activity, which is proportional to the number of nuclei still present."),
          { type: "table", head: ["Time (hours)", "Counts per minute"], rows: [0, 1, 2, 3].map((i) => [String(i * h), fmt(c0 / 2 ** i)]) },
        ],
        questions: [
          q(r, `A sample contains ${fmt(N0)} nuclei of an isotope with a half-life of ${T} days. How many remain after ${3 * T} days?`, fmt(N0 / 8), [fmt(N0 / 4), fmt(N0 / 3), fmt(N0 / 6)], `${3 * T} days = 3 half-lives → ${fmt(N0)} · 1/8 = ${fmt(N0 / 8)}.`),
          q(r, `How long does it take until only 25% of the original nuclei remain (half-life ${T} days)?`, `${2 * T} days`, [`${T} days`, `${4 * T} days`, `${T / 4} days`], "25% = 1/4 = (1/2)², i.e. two half-lives."),
          q(r, "Using the measurements in the table, what is the half-life?", `${h} hours`, [`${2 * h} hours`, `${h / 2} hours`, `${3 * h} hours`], `The count rate halves every ${h} hours.`),
          q(r, "What percentage of the nuclei have decayed after two half-lives?", "75%", ["50%", "25%", "100%"], "25% remain, so 75% have decayed."),
          q(r, "The amount of material in a sample is doubled. What happens to the half-life?", "It stays the same.", ["It doubles.", "It halves.", "It increases by one hour."], "The half-life is a property of the isotope, not of the amount."),
          q(r, `Two samples start with the same number of nuclei. X has a half-life of ${a} years, Y of ${2 * a} years. After ${2 * a} years, how many times more nuclei does Y have than X?`, "2", ["4", "1/2", "1"], `X: 2 half-lives → 1/4; Y: 1 half-life → 1/2. Ratio (1/2) ÷ (1/4) = 2.`),
        ],
      };
    },
  },
  {
    id: "ohms-law",
    title: "Current, voltage and power",
    field: "Engineering",
    generate(seed) {
      const r = rng(seed);
      const R = r.pick([10, 20, 50]);
      const I = r.pick([0.5, 1, 2]);
      const U = R * I;
      const R1 = r.pick([10, 20, 30]);
      const R2 = r.pick([10, 20, 40]);
      const I2 = r.pick([0.5, 1, 2]);
      const U2 = I2 * (R1 + R2);
      const Rp = r.pick([20, 40, 100]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("In many conductors the current I is proportional to the applied voltage U. The constant of proportionality is the resistance R (Ohm's law):"),
          F("U = R · I        P = U · I = I² · R"),
          P("P is the electrical power converted in the resistor. Units: volt (V), ampere (A), ohm (Ω), watt (W)."),
          P("Resistors in series carry the same current; their resistances add up: R = R₁ + R₂. Two equal resistors R in parallel have a combined resistance of R/2."),
        ],
        questions: [
          q(r, `A voltage of ${fmt(U)} V is applied to a resistor of ${R} Ω. What current flows?`, `${fmt(I)} A`, [`${fmt(U * R)} A`, `${fmt(R / U)} A`, `${fmt(I * 2)} A`], `I = U / R = ${fmt(U)} / ${R} = ${fmt(I)} A.`),
          q(r, `Resistors of ${R1} Ω and ${R2} Ω are connected in series to ${fmt(U2)} V. What current flows?`, `${fmt(I2)} A`, [`${fmt(U2 / R1)} A`, `${fmt(U2 / R2)} A`, `${fmt(I2 * 2)} A`], `R = ${R1 + R2} Ω, I = ${fmt(U2)} / ${R1 + R2} = ${fmt(I2)} A.`),
          q(r, `What power is converted in the ${R} Ω resistor from the first question?`, `${fmt(U * I)} W`, [`${fmt(U / I)} W`, `${fmt(U + I)} W`, `${fmt(U * I * 2)} W`], `P = U · I = ${fmt(U)} · ${fmt(I)} = ${fmt(U * I)} W.`),
          q(r, "The voltage across a fixed resistor is doubled. What happens to the current?", "It doubles.", ["It halves.", "It stays the same.", "It increases fourfold."], "I = U / R with R fixed."),
          q(r, `Two ${Rp} Ω resistors are connected in parallel. What is the combined resistance?`, `${Rp / 2} Ω`, [`${2 * Rp} Ω`, `${Rp} Ω`, `${Rp / 4} Ω`], "Two equal resistors in parallel: R/2."),
          q(r, "The current through a fixed resistor doubles. By what factor does the power increase?", "4", ["2", "1", "8"], "P = I² · R: doubling I multiplies P by 2² = 4."),
        ],
      };
    },
  },
  {
    id: "break-even",
    title: "Break-even analysis",
    field: "Business administration",
    generate(seed) {
      const r = rng(seed);
      const cm = r.pick([10, 20, 25, 40, 50]);
      const be = r.pick([400, 600, 800, 1200, 1500]);
      const F0 = cm * be;
      const p = cm + r.pick([30, 50, 70]);
      const v = p - cm;
      const extra = r.pick([100, 200, 500]);
      const target = cm * r.pick([200, 400]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("A company's costs consist of fixed costs F (rent, salaries — independent of the quantity produced) and variable costs v per unit. Each unit sold at price p contributes the contribution margin (p − v) towards covering the fixed costs."),
          P("The break-even quantity is the number of units at which revenue equals total costs, i.e. profit is zero:"),
          F("q(BE) = F / (p − v)        Profit(q) = q · (p − v) − F"),
          { type: "table", head: ["Item", "Value"], rows: [["Fixed costs F per month", eur(F0)], ["Selling price p", eur(p)], ["Variable costs v per unit", eur(v)]] },
        ],
        questions: [
          q(r, "What is the break-even quantity per month?", `${fmt(be)} units`, [`${fmt(Math.round(F0 / p))} units`, `${fmt(Math.round(F0 / v))} units`, `${fmt(be * 2)} units`], `F / (p − v) = ${fmt(F0)} / ${cm} = ${fmt(be)}.`),
          q(r, "What is the contribution margin per unit?", eur(cm), [eur(p), eur(v), eur(p + v)], `p − v = ${p} − ${v} = ${cm}.`),
          q(r, `What is the monthly profit if ${fmt(be + extra)} units are sold?`, eur(extra * cm), [eur((be + extra) * cm), eur(extra * p), eur(0)], `${fmt(be + extra)} · ${cm} − ${fmt(F0)} = ${fmt(extra * cm)} (each unit beyond break-even adds ${cm}).`),
          q(r, `The price rises by ${eur(cm)} while costs stay the same. What is the new break-even quantity?`, `${fmt(be / 2)} units`, [`${fmt(be * 2)} units`, `${fmt(be)} units`, `${fmt(be - cm)} units`], `The margin doubles to ${2 * cm}, so ${fmt(F0)} / ${2 * cm} = ${fmt(be / 2)}.`),
          q(r, "Which change lowers the break-even quantity?", "Lower fixed costs", ["Higher variable costs per unit", "A lower selling price", "Higher fixed costs"], "A smaller F (or a larger margin) means fewer units are needed to cover F."),
          q(r, `How many units must be sold per month for a profit of ${eur(target)}?`, `${fmt(be + target / cm)} units`, [`${fmt(target / cm)} units`, `${fmt(be)} units`, `${fmt(be + target / p)} units`], `(F + profit) / margin = (${fmt(F0)} + ${fmt(target)}) / ${cm} = ${fmt(be + target / cm)}.`),
        ],
      };
    },
  },
  {
    id: "elasticity",
    title: "Price elasticity of demand",
    field: "Economics",
    generate(seed) {
      const r = rng(seed);
      const [dp, dq] = r.pick([[5, 10], [10, 20], [10, 5], [20, 10], [10, 30], [20, 5]] as const);
      const e = dq / dp;
      const e2 = r.pick([0.5, 2]);
      const p2 = r.pick([4, 10]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("The price elasticity of demand measures how strongly the quantity demanded reacts to a price change:"),
          F("E = (percentage change in quantity) / (percentage change in price)"),
          P("Because demand usually falls when the price rises, E is normally negative; economists often compare its absolute value |E|. If |E| > 1, demand is elastic: quantity reacts more than proportionally, and a price increase lowers total revenue (price × quantity). If |E| < 1, demand is inelastic and a price increase raises revenue. If |E| = 1, revenue stays roughly the same."),
          P("Goods with few substitutes, or that people need regardless of price, tend to have inelastic demand."),
        ],
        questions: [
          q(r, `A price rises by ${dp}% and the quantity demanded falls by ${dq}%. What is |E|?`, fmt(e), [fmt(dp / dq), fmt(dq - dp), fmt(dq * dp)], `|E| = ${dq} / ${dp} = ${fmt(e)}.`),
          q(r, `Is demand in the previous question elastic or inelastic?`, e > 1 ? "Elastic" : "Inelastic", [e > 1 ? "Inelastic" : "Elastic", "Unit elastic", "It cannot be decided"], `|E| = ${fmt(e)} is ${e > 1 ? "greater" : "less"} than 1.`),
          q(r, "For a good with elastic demand, a firm raises its price. What happens to total revenue?", "It falls.", ["It rises.", "It stays exactly the same.", "It doubles."], "Quantity falls by a larger percentage than the price rises."),
          q(r, `|E| = ${fmt(e2)} and the price rises by ${p2}%. By roughly how much does the quantity demanded fall?`, `${fmt(e2 * p2)}%`, [`${fmt(p2 / e2)}%`, `${fmt(p2)}%`, `${fmt(e2 * p2 * 2)}%`], `%ΔQ ≈ |E| · %ΔP = ${fmt(e2)} · ${p2} = ${fmt(e2 * p2)}%.`),
          q(r, "If |E| = 1, a small price increase leaves total revenue …", "roughly unchanged", ["much higher", "much lower", "at zero"], "Price and quantity change by the same percentage in opposite directions."),
          q(r, "According to the text, which good is most likely to have inelastic demand?", "A medicine without close substitutes", ["One particular brand of soft drink", "A holiday trip abroad", "A specific model of headphones"], "Few substitutes and necessity make demand less responsive to price."),
        ],
      };
    },
  },
  {
    id: "mean-median",
    title: "Averages and survey samples",
    field: "Social sciences",
    generate(seed) {
      const r = rng(seed);
      // Five values with an integer mean.
      let vals: number[] = [];
      for (let t = 0; t < 50; t++) {
        vals = [r.int(2, 9), r.int(2, 9), r.int(2, 9), r.int(2, 9)];
        const need = 5 - (vals.reduce((a, b) => a + b, 0) % 5);
        const fifth = r.int(2, 9);
        vals.push(fifth + ((need - (fifth % 5) + 5) % 5));
        if (vals[4] <= 15 && new Set(vals).size >= 4) break;
      }
      const sorted = [...vals].sort((a, b) => a - b);
      const mean = vals.reduce((a, b) => a + b, 0) / 5;
      const median = sorted[2];
      const out = 40;
      const six = [...sorted, out];
      const median6 = (six[2] + six[3]) / 2;
      const n = r.pick([200, 400, 500]);
      const pct = r.pick([15, 20, 35, 40]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("Two common measures of a 'typical' value are the arithmetic mean (the sum of all values divided by their number) and the median (the middle value when the data are sorted; with an even number of values, the mean of the two middle values)."),
          P("The mean uses every value, so a single extreme value — an outlier — can shift it a lot. The median depends only on the order of the data and is therefore robust against outliers."),
          P("Survey results can only be generalised if the sample represents the population. If the way people are selected makes some groups more likely to take part than others, the sample is biased (selection bias)."),
          { type: "table", head: ["Student", "A", "B", "C", "D", "E"], rows: [["Hours of study per day", ...vals.map(String)]] },
        ],
        questions: [
          q(r, "What is the mean number of study hours in the table?", fmt(mean), [fmt(median), fmt(mean + 1), fmt(sorted[4] - sorted[0])], `Sum ${vals.reduce((a, b) => a + b, 0)} ÷ 5 = ${fmt(mean)}.`),
          q(r, "What is the median?", fmt(median), [fmt(mean === median ? mean + 1 : mean), fmt(sorted[1]), fmt(sorted[3] === median ? median + 2 : sorted[3])], `Sorted: ${sorted.join(", ")} → middle value ${median}.`),
          q(r, `A sixth student who studies ${out} hours per week is added. What is the new median?`, fmt(median6), [fmt(median), fmt((sorted.reduce((a, b) => a + b, 0) + out) / 6), fmt(out)], `Sorted: ${six.join(", ")} → (${six[2]} + ${six[3]}) ÷ 2 = ${fmt(median6)}.`),
          q(r, "Which measure is less affected by the outlier?", "The median", ["The mean", "Both equally", "Neither is affected"], "The median only depends on the middle position."),
          q(r, "A survey about reading habits is handed out only to visitors of a public library. What is the main problem?", "Selection bias: library visitors probably read more than average.", ["The sample is too large.", "The median cannot be calculated.", "There is no problem if enough people answer."], "Who is asked influences the result — the sample does not represent the population."),
          q(r, `${pct}% of ${n} respondents agree with a statement. How many people is that?`, fmt((n * pct) / 100), [fmt(pct), fmt((n * pct) / 10), fmt(n - (n * pct) / 100)], `${n} · ${pct}/100 = ${fmt((n * pct) / 100)}.`),
        ],
      };
    },
  },
  {
    id: "car-free-centre",
    title: "An argument about a car-free city centre",
    field: "Humanities / argumentation",
    generate(seed) {
      const r = rng(seed);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("(1) The council of the fictional town of Weldorf is debating whether to close its historic centre to private cars. The author of the following commentary supports the plan."),
          P("(2) 'Shop owners fear they will lose customers if people can no longer park in front of their doors. Yet most visitors to the centre already arrive on foot, by bicycle or by bus. Closing the centre to cars would not keep these people away — it would make their visit more pleasant.'"),
          P("(3) 'Critics point out that elderly residents depend on their cars. This concern is legitimate, but it is not an argument against the plan as such; it is an argument for exceptions, such as permits for residents with limited mobility and a better bus service.'"),
          P("(4) 'A car-free centre is not a radical experiment. It is a sensible step that would make Weldorf's streets safer and quieter — provided the council takes the concerns of those affected seriously.'"),
        ],
        questions: [
          q(r, "What is the author's main claim?", "The centre should be closed to private cars, with sensible exceptions.", ["Shops in the centre will close.", "Elderly residents should move out of the centre.", "Weldorf needs more parking spaces."], "Paragraphs 2–4 defend the plan; paragraph 3 adds exceptions."),
          q(r, "Which assumption does the argument in paragraph 2 rely on?", "Most customers of the centre do not arrive by car.", ["Shop owners are always right.", "Buses are free of charge.", "Cars are banned in all historic towns."], "The argument only works if few visitors come by car."),
          q(r, "Which finding would most WEAKEN the argument in paragraph 2?", "A survey shows that most of the centre's customers arrive by car.", ["Cyclists like quiet streets.", "The bus service runs every ten minutes.", "Other towns have historic centres too."], "It directly contradicts the assumption that few visitors come by car."),
          q(r, "How does the author treat the critics' objection in paragraph 3?", "Accepts the concern and turns it into a reason for exceptions", ["Rejects it as untrue", "Ignores it", "Uses it to argue against the plan"], "'This concern is legitimate … it is an argument for exceptions.'"),
          q(r, "What does 'not a radical experiment' (paragraph 4) mean here?", "The plan is a moderate, reasonable measure.", ["The plan has never been tried anywhere.", "The plan is scientifically tested.", "The plan is dangerous."], "The author contrasts 'radical' with 'sensible step'."),
          q(r, "What is the author's overall attitude to the plan?", "Supportive, with conditions", ["Strongly opposed", "Neutral and undecided", "Indifferent"], "Supports it 'provided the council takes the concerns … seriously'."),
        ],
      };
    },
  },
  {
    id: "diagnostic-test",
    title: "Positive test results and base rates",
    field: "Mathematics / statistics",
    generate(seed) {
      const r = rng(seed);
      const N = 1000;
      let prev = 2, sens = 90, spec = 95;
      for (let t = 0; t < 50; t++) {
        prev = r.pick([2, 5, 10]);
        sens = r.pick([80, 90]);
        spec = r.pick([90, 95]);
        const healthy = N - (N * prev) / 100;
        if (Number.isInteger((healthy * (100 - spec)) / 100) && Number.isInteger(((N * prev) / 100) * (sens / 100))) break;
      }
      const sick = (N * prev) / 100;
      const tp = (sick * sens) / 100;
      const healthy = N - sick;
      const fp = (healthy * (100 - spec)) / 100;
      const ppv = Math.round((tp / (tp + fp)) * 100);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P(`A screening test for a disease is described by two numbers. Its sensitivity is the share of sick people who test positive (here ${sens}%). Its specificity is the share of healthy people who test negative (here ${spec}%).`),
          P(`In the population being screened, ${prev}% of people have the disease (the base rate). Consider ${fmt(N)} people. The decisive question for a person with a positive result is: how likely is it that I am actually sick?`),
          F("P(sick | positive) = true positives / (true positives + false positives)"),
          P("When a disease is rare, even a good test can produce more false positives than true positives, because the healthy group is so much larger."),
        ],
        questions: [
          q(r, `How many of the ${fmt(N)} people have the disease?`, fmt(sick), [fmt(prev), fmt(N - sick), fmt(sick * 10)], `${prev}% of ${fmt(N)} = ${fmt(sick)}.`),
          q(r, "How many sick people test positive (true positives)?", fmt(tp), [fmt(sick), fmt(sick - tp), fmt(fp)], `${sens}% of ${fmt(sick)} = ${fmt(tp)}.`),
          q(r, "How many healthy people test positive (false positives)?", fmt(fp), [fmt(healthy - fp), fmt(tp), fmt((healthy * spec) / 1000)], `${100 - spec}% of ${fmt(healthy)} healthy people = ${fmt(fp)}.`),
          q(r, "How many people test positive in total?", fmt(tp + fp), [fmt(tp), fmt(sick), fmt(tp + fp + sick)], `${fmt(tp)} + ${fmt(fp)} = ${fmt(tp + fp)}.`),
          q(r, "Roughly how likely is a person with a positive result to be sick?", `about ${ppv}%`, [`about ${sens}%`, `about ${spec}%`, `about ${prev === ppv ? prev + 1 : prev}%`], `${fmt(tp)} / ${fmt(tp + fp)} ≈ ${ppv}%.`),
          q(r, "If the disease were more common (higher base rate) and the test unchanged, the share of sick people among those who test positive would …", "increase", ["decrease", "stay the same", "become 100%"], "More sick people → more true positives relative to false positives."),
        ],
      };
    },
  },
  {
    id: "acceleration",
    title: "Uniform acceleration",
    field: "Natural sciences / physics",
    generate(seed) {
      const r = rng(seed);
      const v0 = r.pick([0, 2, 4]);
      const a = r.pick([1, 2, 3]);
      const t = r.pick([2, 4, 6]);
      const v = v0 + a * t;
      const s = v0 * t + (a * t * t) / 2;
      const k = r.pick([2, 3, 5]);
      const V = v0 + a * k;
      const vf = r.pick([10, 20, 30]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("A body moves with uniform acceleration when its velocity changes by the same amount every second. With initial velocity v₀ (in m/s) and acceleration a (in m/s²), after a time t (in s):"),
          F("v(t) = v₀ + a · t        s(t) = v₀ · t + ½ · a · t²"),
          P("s is the distance covered. For a body starting from rest (v₀ = 0), the distance grows with the square of time. Its average velocity over the interval is half its final velocity."),
        ],
        questions: [
          q(r, `A cart starts at ${v0} m/s and accelerates at ${a} m/s². What is its velocity after ${t} s?`, `${fmt(v)} m/s`, [`${fmt(a * t)} m/s`, `${fmt(v0 + a)} m/s`, `${fmt(v * 2)} m/s`], `v = ${v0} + ${a} · ${t} = ${fmt(v)} m/s.`),
          q(r, "What distance does it cover in that time?", `${fmt(s)} m`, [`${fmt(v * t)} m`, `${fmt(a * t * t)} m`, `${fmt(s + v0)} m`], `s = ${v0} · ${t} + ½ · ${a} · ${t}² = ${fmt(s)} m.`),
          q(r, `How long does the cart take to reach ${fmt(V)} m/s?`, `${k} s`, [`${k * 2} s`, `${fmt(V / a)} s`, `${k + 1} s`].map((x) => (x === `${k} s` ? `${k + 2} s` : x)), `t = (${fmt(V)} − ${v0}) / ${a} = ${k} s.`),
          q(r, "A body starting from rest accelerates uniformly for twice as long. The distance covered becomes …", "four times as large", ["twice as large", "the same", "eight times as large"], "s = ½ a t² grows with t²."),
          q(r, `A body accelerates uniformly from rest to ${vf} m/s. What is its average velocity?`, `${vf / 2} m/s`, [`${vf} m/s`, `${vf * 2} m/s`, `${vf / 4} m/s`], "For uniform acceleration from rest, the average velocity is half the final velocity."),
          q(r, "Which unit does acceleration have?", "m/s²", ["m/s", "m²/s", "s/m"], "Velocity change (m/s) per second."),
        ],
      };
    },
  },
  {
    id: "market-equilibrium",
    title: "Supply, demand and market equilibrium",
    field: "Economics",
    generate(seed) {
      const r = rng(seed);
      const b = r.pick([1, 2, 4]);
      const d = r.pick([1, 2, 3]);
      const pStar = r.pick([5, 10, 20]);
      const c = r.pick([0, 10, 20]);
      const a = c + (b + d) * pStar;
      const qStar = c + d * pStar;
      const k = r.pick([2, 4]);
      const m = r.pick([1, 2]);
      const shift = (b + d) * m;
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("In a simple market model, the quantity buyers want (demand, Qd) falls as the price p rises, and the quantity sellers offer (supply, Qs) rises with the price. For a particular market the following linear functions apply (p in euros, quantities in units per week):"),
          F(`Qd = ${a} − ${b === 1 ? "" : `${b}·`}p        Qs = ${c === 0 ? "" : `${c} + `}${d === 1 ? "" : `${d}·`}p`),
          P("At the equilibrium price, the quantity demanded equals the quantity supplied. If the price is below the equilibrium, buyers want more than sellers offer (a shortage, or excess demand); if it is above, there is a surplus."),
          P("If demand increases — for example because incomes rise — buyers want more at every price: the demand function shifts and a new equilibrium forms."),
        ],
        questions: [
          q(r, "What is the equilibrium price?", eur(pStar), [eur(a / b), eur(2 * pStar), eur(pStar / 2), eur(pStar + 5)], `${a} − ${b}p = ${c} + ${d}p → ${b + d}p = ${a - c} → p = ${pStar}.`),
          q(r, "What quantity is traded at the equilibrium?", `${fmt(qStar)} units`, [`${fmt(a)} units`, `${fmt(c)} units`, `${fmt(2 * qStar)} units`, `${fmt(qStar + b + d)} units`], `Qs = ${c} + ${d} · ${pStar} = ${qStar} (and Qd = ${a} − ${b} · ${pStar} = ${qStar}).`),
          q(r, `The price is fixed at ${eur(pStar - k)}. How large is the shortage?`, `${fmt((b + d) * k)} units`, [`${fmt(b * k)} units`, `${fmt(d * k)} units`, `${fmt(2 * (b + d) * k)} units`, `${fmt((b + d) * k + k)} units`], `Qd − Qs = (${a} − ${b}·${pStar - k}) − (${c} + ${d}·${pStar - k}) = ${(b + d) * k}.`),
          q(r, "What happens when the price is set above the equilibrium price?", "Sellers offer more than buyers want (a surplus).", ["Buyers want more than sellers offer (a shortage).", "Demand and supply stay equal.", "Both demand and supply rise."], "Above the equilibrium, Qs > Qd."),
          q(r, `Demand increases by ${shift} units at every price (supply unchanged). What is the new equilibrium price?`, eur(pStar + m), [eur(pStar), eur(pStar + shift), eur(pStar - m), eur(pStar + 2 * m + 1)], `New Qd = ${a + shift} − ${b}p. ${b + d}p = ${a + shift - c} → p = ${pStar + m}.`),
          q(r, "A bad harvest reduces the supply of a crop (demand unchanged). What happens to its equilibrium price and quantity?", "The price rises and the quantity falls.", ["The price falls and the quantity rises.", "Both rise.", "Both fall."], "Less is offered at every price, so buyers compete for fewer units: higher price, lower quantity."),
        ],
      };
    },
  },
  {
    id: "stack-queue",
    title: "Stacks and queues",
    field: "Computational sciences",
    generate(seed) {
      const r = rng(seed);
      const [v1, v2, v3, v4, v5] = r.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5);
      // Same operations on both structures: add v1, v2, v3 · remove · add v4, v5 · remove.
      const stack = [v1, v2, v3];
      const sOut = [stack.pop()!];
      stack.push(v4, v5);
      sOut.push(stack.pop()!);
      const queue = [v1, v2, v3];
      const qOut = [queue.shift()!];
      queue.push(v4, v5);
      qOut.push(queue.shift()!);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("A stack and a queue both store a sequence of elements, but they differ in which element is removed next."),
          P("A stack works on the principle 'last in, first out' (LIFO): 'push' places an element on top, and 'pop' removes the element on top — the one added most recently. A queue works on the principle 'first in, first out' (FIFO): 'enqueue' adds an element at the back, and 'dequeue' removes the element at the front — the one that has waited longest."),
          P(`Both structures start empty and receive the same operations: add ${v1}, add ${v2}, add ${v3}, remove, add ${v4}, add ${v5}, remove. ('add' is push or enqueue; 'remove' is pop or dequeue.)`),
        ],
        questions: [
          q(r, "Which elements does the STACK remove, in order?", `${sOut[0]}, then ${sOut[1]}`, [`${qOut[0]}, then ${qOut[1]}`, `${sOut[1]}, then ${sOut[0]}`, `${sOut[0]}, then ${v4}`], `Pop takes the most recent element: ${v3} (after ${v1}, ${v2}, ${v3}), later ${v5}.`),
          q(r, "Which element is on top of the stack at the end?", String(stack.at(-1)), [String(v5), String(v1), String(v2)], `Remaining stack (bottom → top): ${stack.join(", ")}.`),
          q(r, "Which element is at the front of the queue at the end?", String(queue[0]), [String(v1), String(v2), String(v5)], `Dequeued ${qOut.join(" and ")}; remaining queue (front → back): ${queue.join(", ")}.`),
          q(r, "How many elements does each structure hold at the end?", "3", ["5", "2", "7"], "5 additions − 2 removals = 3 in both."),
          q(r, "A printer should handle print jobs in the order they arrive. Which structure fits?", "A queue", ["A stack", "Either — the order is the same", "Neither can store jobs"], "Arrival order = first in, first out."),
          q(r, "The 'undo' function of a text editor reverses the most recent change first. Which structure fits?", "A stack", ["A queue", "A sorted list", "Either — the order is the same"], "The last change made is the first one undone: LIFO."),
        ],
      };
    },
  },
  {
    id: "dilution",
    title: "Concentration and dilution",
    field: "Natural sciences / chemistry",
    generate(seed) {
      const r = rng(seed);
      const c1 = r.pick([2, 4, 5]);
      const V1 = r.pick([50, 100, 200]);
      const f = r.pick([2, 4, 5, 10]);
      const V2 = V1 * f;
      const n = (c1 * V1) / 1000;
      const g = r.pick([4, 5, 10]);
      const V3 = r.pick([100, 200, 500]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("The (molar) concentration c of a solution is the amount of dissolved substance n (in mol) divided by the volume V of the solution (in litres):"),
          F("c = n / V        dilution: c₁ · V₁ = c₂ · V₂"),
          P("When a solution is diluted with water, the amount of dissolved substance does not change — only the volume grows. Therefore the product of concentration and volume is the same before (c₁, V₁) and after (c₂, V₂) the dilution. Remember that 1 L = 1,000 mL."),
          P(`A laboratory has a stock solution with a concentration of ${c1} mol/L.`),
        ],
        questions: [
          q(r, `${V1} mL of the stock solution are diluted with water to a total volume of ${fmt(V2)} mL. What is the new concentration?`, `${fmt(c1 / f)} mol/L`, [`${fmt(c1 * f)} mol/L`, `${c1} mol/L`, `${fmt(c1 / (2 * f))} mol/L`], `c₂ = ${c1} · ${V1} / ${fmt(V2)} = ${fmt(c1 / f)} mol/L.`),
          q(r, `What amount of substance is contained in ${V1} mL of the stock solution?`, `${fmt(n)} mol`, [`${fmt(c1 * V1)} mol`, `${fmt(n * f)} mol`, `${fmt(n / 10)} mol`], `n = c · V = ${c1} mol/L · ${fmt(V1 / 1000)} L = ${fmt(n)} mol.`),
          q(r, `How much water must be added to ${V1} mL of stock to reach ${fmt(V2)} mL?`, `${fmt(V2 - V1)} mL`, [`${fmt(V2)} mL`, `${fmt(V2 + V1)} mL`, `${fmt(V1 / f)} mL`], `${fmt(V2)} − ${V1} = ${fmt(V2 - V1)} mL.`),
          q(r, `You need ${V3} mL of a ${fmt(c1 / g)} mol/L solution. How much stock solution do you measure out?`, `${fmt(V3 / g)} mL`, [`${fmt(V3 * g)} mL`, `${fmt(V3)} mL`, `${fmt(V3 - V3 / g)} mL`], `V₁ = c₂ · V₂ / c₁ = ${fmt(c1 / g)} · ${V3} / ${c1} = ${fmt(V3 / g)} mL.`),
          q(r, "What stays the same when a solution is diluted with water?", "The amount of dissolved substance", ["The concentration", "The volume", "Both concentration and volume"], "Only water is added; n is unchanged."),
          q(r, "Water is added until the volume of a solution is doubled. The concentration …", "halves", ["doubles", "stays the same", "falls to a quarter"], "c = n / V with n fixed: twice the volume, half the concentration."),
        ],
      };
    },
  },
  {
    id: "lever",
    title: "Levers and torque",
    field: "Engineering / mechanics",
    generate(seed) {
      const r = rng(seed);
      const d2 = r.pick([0.5, 2]);
      const k = r.pick([2, 4, 5]);
      const d1 = d2 * k;
      const F2 = r.pick([200, 400, 600, 1000]);
      const F1 = F2 / k;
      const h = r.pick([2, 5, 10]);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("A lever is a rigid bar that turns about a pivot. A force F acting at a distance d from the pivot (measured perpendicular to the force) produces a torque M = F · d, measured in newton-metres (N·m)."),
          P("The lever is in balance when the torques on both sides of the pivot are equal:"),
          F("F₁ · d₁ = F₂ · d₂"),
          P(`A worker uses a lever to lift a load. The load presses with F₂ = ${fmt(F2)} N at d₂ = ${fmt(d2)} m from the pivot; the worker pushes at d₁ = ${fmt(d1)} m on the other side. A lever reduces the force needed, but not the work: the end with the smaller force moves a correspondingly longer distance.`),
        ],
        questions: [
          q(r, "What force F₁ must the worker apply to balance the load?", `${fmt(F1)} N`, [`${fmt(F2 * k)} N`, `${fmt(F2)} N`, `${fmt(F1 / 2)} N`], `F₁ = F₂ · d₂ / d₁ = ${fmt(F2)} · ${fmt(d2)} / ${fmt(d1)} = ${fmt(F1)} N.`),
          q(r, "What torque does the load produce about the pivot?", `${fmt(F2 * d2)} N·m`, [`${fmt(F2 / d2)} N·m`, `${fmt(F2 * d1)} N·m`, `${fmt(F2 + d2)} N·m`], `M = ${fmt(F2)} N · ${fmt(d2)} m = ${fmt(F2 * d2)} N·m.`),
          q(r, "By what factor does this lever multiply the worker's force?", String(k), [`1/${k}`, String(2 * k), String(k + 1)], `F₂ / F₁ = d₁ / d₂ = ${fmt(d1)} / ${fmt(d2)} = ${k}.`),
          q(r, `The load is raised by ${h} cm. How far does the worker's end of the lever move?`, `${fmt(k * h)} cm`, [`${h} cm`, `${fmt(h / k)} cm`, `${fmt(2 * k * h)} cm`], `The distances are in the ratio d₁ : d₂ = ${k} : 1, so ${k} · ${h} = ${fmt(k * h)} cm.`),
          q(r, "The worker moves their hands twice as far from the pivot (same load). The force needed …", "halves", ["doubles", "stays the same", "falls to a quarter"], "F₁ = F₂ · d₂ / d₁: doubling d₁ halves F₁."),
          q(r, "Which statement about the lever is correct?", "It reduces the force needed, but not the work done.", ["It reduces both the force and the work.", "It reduces the work, but not the force.", "It increases the work done on the load."], "Smaller force × longer distance = the same work."),
        ],
      };
    },
  },
  {
    id: "correlation",
    title: "Correlation and causation",
    field: "Social sciences / research methods",
    generate(seed) {
      const r = rng(seed);
      const [rv, strength] = r.pick([
        [-0.9, "a strong negative"],
        [-0.3, "a weak negative"],
        [0.3, "a weak positive"],
        [0.8, "a strong positive"],
      ] as const);
      return {
        kind: "subject", id: this.id, seed, title: this.title, field: this.field,
        text: [
          P("Two variables are correlated when they tend to change together. The correlation coefficient r describes a linear relationship and lies between −1 and +1: values near +1 mean that high values of one variable go with high values of the other; values near −1 mean that high values go with low values; values near 0 mean there is no linear relationship (there may still be a non-linear one)."),
          P("A correlation alone does not show that one variable causes the other. A classic example: in summer, ice-cream sales and the number of swimming accidents both rise. Ice cream does not cause accidents — hot weather increases both. Such a hidden common cause is called a confounding variable. It is also possible that the causal direction runs the other way round (reverse causation)."),
          P("The most reliable way to test a causal claim is a randomised controlled experiment: participants are assigned to groups by chance, so that confounding variables are, on average, equally distributed across the groups."),
        ],
        questions: [
          q(r, `A study reports r = ${rv} between two variables. What does this indicate?`, `${strength[0].toUpperCase()}${strength.slice(1)} linear relationship`, [
            rv < 0 ? `${strength.replace("negative", "positive").replace(/^a/, "A")} linear relationship` : `${strength.replace("positive", "negative").replace(/^a/, "A")} linear relationship`,
            "No relationship of any kind",
            Math.abs(rv) > 0.5 ? `${(rv < 0 ? "a weak negative" : "a weak positive").replace(/^a/, "A")} linear relationship` : `${(rv < 0 ? "a strong negative" : "a strong positive").replace(/^a/, "A")} linear relationship`,
          ], `The sign gives the direction, the size (|r| = ${Math.abs(rv)}) the strength.`),
          q(r, "In the ice-cream example, what is the confounding variable?", "Hot weather", ["Ice-cream sales", "Swimming accidents", "The correlation coefficient"], "Hot weather raises both ice-cream sales and the number of swimmers."),
          q(r, "Which study design is best suited to show that a new teaching method causes better exam results?", "Students are assigned to the new or the old method at random, and the results are compared.", ["Schools that already use the new method are compared with other schools.", "Students who like the new method are asked how well they did.", "Exam results are compared before and after a single class switched methods."], "Random assignment balances confounders such as motivation or school quality."),
          q(r, "Cities with more police officers record more crimes. Which explanation is an example of reverse causation?", "Cities with more crime hire more police officers.", ["Police officers commit the crimes.", "Larger cities have both more police and more crime.", "The correlation is a measurement error."], "The suspected effect (crime) causes the supposed cause (police numbers). City size would be a confounder."),
          q(r, "Two variables have r = 0. What can be concluded?", "There is no linear relationship, but there may be a non-linear one.", ["The variables are completely unrelated.", "One variable causes the other.", "The study must contain an error."], "r only measures linear relationships."),
          q(r, "What is the main message of the text?", "A correlation alone does not prove that one variable causes the other.", ["Correlations are always caused by hot weather.", "Experiments are never necessary.", "Correlation coefficients above 0.5 prove causation."], "Confounding variables and reverse causation can produce correlations without a direct causal link."),
        ],
      };
    },
  },
];

export function generateSubject(seed: number, passageId?: string): SubjectItem {
  const r = rng(seed);
  const p = passageId ? PASSAGES.find((x) => x.id === passageId) ?? r.pick(PASSAGES) : r.pick(PASSAGES);
  return p.generate(seed);
}
