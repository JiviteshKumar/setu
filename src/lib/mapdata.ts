import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getProgrammes } from "./programmes";
import { DE, WORLD, type CityPoint } from "./map";

type MapFile = {
  germany: { viewBox: string; path: string };
  world: {
    land: string;
    germany: string;
    india: string;
    origins: { name: string; xy: [number, number] }[];
    destination: { name: string; xy: [number, number] };
  };
};
type CitiesFile = { cities: Record<string, { x: number; y: number } | null> };

const dir = join(process.cwd(), "data");
const mapFile: MapFile | null = existsSync(join(dir, "map.json")) ? JSON.parse(readFileSync(join(dir, "map.json"), "utf-8")) : null;
const citiesFile: CitiesFile | null = existsSync(join(dir, "cities.json")) ? JSON.parse(readFileSync(join(dir, "cities.json"), "utf-8")) : null;

export type WorldMap = MapFile["world"] & { viewBox: string };
export type GermanyMapData = { viewBox: string; path: string; cities: CityPoint[] };

export function getWorldMap(): WorldMap | null {
  return mapFile ? { ...mapFile.world, viewBox: `0 0 ${WORLD.width} ${WORLD.height}` } : null;
}

/** Germany outline + one dot per city with public-university programmes (only cities inside Germany). */
export function getGermanyMap(): GermanyMapData | null {
  if (!mapFile) return null;
  const counts = new Map<string, number>();
  for (const p of getProgrammes()) counts.set(p.city, (counts.get(p.city) ?? 0) + 1);
  const cities: CityPoint[] = [];
  for (const [city, n] of counts) {
    const c = citiesFile?.cities[city];
    if (!c || c.x < 0 || c.y < 0 || c.x > DE.width || c.y > DE.height) continue;
    cities.push({ city, x: c.x, y: c.y, programmes: n });
  }
  cities.sort((a, b) => a.y - b.y);
  return { viewBox: mapFile.germany.viewBox, path: mapFile.germany.path, cities };
}
