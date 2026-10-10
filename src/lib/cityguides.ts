import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CityGuide, Poi } from "../../scripts/build-city-guides.ts";
import { getProgrammes } from "./programmes";

export type { CityGuide, Poi };

const FILE = join(process.cwd(), "data", "city-guides.json");
const data: { builtAt: string; cities: CityGuide[] } = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf-8")) : { builtAt: new Date(0).toISOString(), cities: [] };
const bySlug = new Map(data.cities.map((c) => [c.slug, c]));

export const cityGuidesBuiltAt = () => data.builtAt;
export const getCityGuides = () => data.cities;
export const getCityGuide = (slug: string) => bySlug.get(slug);
export const slugForCity = (city: string) => data.cities.find((c) => c.city === city)?.slug ?? null;

/** Universities and courses in a city, plus each university's own living-cost and accommodation notes (from DAAD). */
export function cityStudy(city: string) {
  const progs = getProgrammes().filter((p) => p.city === city);
  const unis = new Map<string, { name: string; website: string | null; living: string | null; accommodation: string | null; buddy: boolean; count: number }>();
  for (const p of progs) {
    const u = unis.get(p.universityId) ?? { name: p.university, website: p.universityWebsite, living: null, accommodation: null, buddy: false, count: 0 };
    u.count++;
    u.living ??= p.costOfLiving;
    u.accommodation ??= p.accommodation;
    u.buddy ||= p.support.includes("Buddy programme");
    unis.set(p.universityId, u);
  }
  return { programmes: progs.length, universities: [...unis.values()].sort((a, b) => b.count - a.count) };
}
