// Simple equirectangular projections for our two maps. Pure functions — shared by the build script and the UI.

/** Germany map: 1° latitude = 100 units, longitude scaled by cos(51°) so the country keeps its shape. */
export const DE = { lon0: 5.5, lat0: 55.2, k: 100, cos: Math.cos((51.2 * Math.PI) / 180), width: 620, height: 820 };

export function projectDE(lon: number, lat: number): [number, number] {
  return [round((lon - DE.lon0) * DE.cos * DE.k), round((DE.lat0 - lat) * DE.k)];
}

/** India → Germany journey map (Europe + South Asia). */
export const WORLD = { lon0: -12, lat0: 62, k: 9, width: 1000, height: 500 };

export function projectWorld(lon: number, lat: number): [number, number] {
  return [round((lon - WORLD.lon0) * WORLD.k), round((WORLD.lat0 - lat) * WORLD.k)];
}

const round = (n: number) => Math.round(n * 10) / 10;

export type CityPoint = { city: string; x: number; y: number; programmes: number };
