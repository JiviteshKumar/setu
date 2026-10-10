import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Programme } from "../../scripts/build-programmes.ts";
import { deadlineTextInfo, type IntakeDeadline } from "./intake";

export type { Programme };

type ProgrammeFile = { builtAt: string; count: number; programmes: Programme[] };

const FILE = join(process.cwd(), "data", "programmes.json");

// Read once at module load: the data only changes when the pipeline is re-run.
const data: ProgrammeFile = existsSync(FILE)
  ? JSON.parse(readFileSync(FILE, "utf-8"))
  : { builtAt: new Date(0).toISOString(), count: 0, programmes: [] };

const byId = new Map(data.programmes.map((p) => [String(p.id), p]));

export function getProgrammes() {
  return data.programmes;
}

export function getProgramme(id: string) {
  return byId.get(id);
}

export function dataBuiltAt() {
  return data.builtAt;
}

/** Compact shape sent to the browser for fast client-side filtering. */
export type ProgrammeSummary = {
  id: number;
  name: string;
  degree: string;
  university: string;
  uniType: string;
  city: string;
  state: string;
  subject: string;
  languages: string[];
  intakes: ("winter" | "summer")[];
  tuition: Programme["tuition"]["category"];
  semesterFee: number | null;
  applyVia: Programme["applyVia"];
  deadlines: IntakeDeadline[];
  hasChecks: boolean;
};

export function getSummaries(): ProgrammeSummary[] {
  return data.programmes.map((p) => ({
    id: p.id,
    name: p.name,
    degree: p.degree,
    university: p.university,
    uniType: p.universityType,
    city: p.city,
    state: p.state,
    subject: p.subject,
    languages: p.languages,
    intakes: p.intakes,
    tuition: p.tuition.category,
    semesterFee: p.semesterContributionEur,
    applyVia: p.applyVia,
    deadlines: intakeDeadlines(p),
    hasChecks: p.checks.length > 0,
  }));
}

type Change = { field: string; before: string | null; after: string | null; detectedAt: string };
const CHANGES_FILE = join(process.cwd(), "data", "programme-changes.json");
const changes: Record<string, Change[]> = existsSync(CHANGES_FILE) ? JSON.parse(readFileSync(CHANGES_FILE, "utf-8")).changes : {};

/** Field changes DAAD made to this programme in the last 180 days (recorded by the data build). */
export function getChanges(id: string | number): Change[] {
  return changes[String(id)] ?? [];
}

/** Deadlines in the shape the intake planner needs (with any year DAAD wrote, and a flag for several listed dates). */
export function intakeDeadlines(p: Programme): IntakeDeadline[] {
  return p.deadlines.map((d) => {
    const info = deadlineTextInfo(d.text);
    return { intake: d.intake, from: d.from, until: d.until, ...(info.years.length ? { years: info.years } : {}), ...(info.multi ? { multi: true } : {}) };
  });
}
