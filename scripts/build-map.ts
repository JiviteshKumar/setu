// Builds the map data used by the UI:
//   data/map.json — SVG paths for Germany and for the India→Germany journey map (Natural Earth via world-atlas, public domain)
//   data/cities.json — coordinates of every city that has a programme (OpenStreetMap Nominatim, © OpenStreetMap contributors)
// Geocoding is cached in data/raw/geocode-cache.json and limited to 1 request/second (Nominatim usage policy).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { OUT, RAW, USER_AGENT, readJson, writeJson, sleep } from "./lib.ts";
import { projectDE, projectWorld, DE, WORLD } from "../src/lib/map.ts";
import type { ListingEntry } from "./fetch-programmes.ts";

const require = createRequire(import.meta.url);

type Ring = [number, number][];
type Geometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

function toPath(geom: Geometry, project: (lon: number, lat: number) => [number, number], minPoints = 0, keep: (ring: Ring) => boolean = () => true): string {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const parts: string[] = [];
  for (const poly of polys) {
    for (const ring of poly) {
      if (ring.length < minPoints || !keep(ring)) continue;
      let last = "";
      const pts: string[] = [];
      for (const [lon, lat] of ring) {
        const [x, y] = project(lon, lat);
        const p = `${x},${y}`;
        if (p !== last) pts.push(p);
        last = p;
      }
      if (pts.length > 2) parts.push(`M${pts.join("L")}Z`);
    }
  }
  return parts.join("");
}

type Geo = { lon: number; lat: number; country: string } | null;

async function nominatim(q: string, germanyOnly: boolean) {
  // featureType=settlement: only cities, towns and villages — never a shop or street that happens to share the name.
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&featureType=settlement&q=${encodeURIComponent(q)}${germanyOnly ? "&countrycodes=de" : ""}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" } });
  const json = (await res.json()) as { lon: string; lat: string; address?: { country_code?: string } }[];
  await sleep(1100); // Nominatim usage policy: max 1 request per second
  return json[0] ? { lon: Number(json[0].lon), lat: Number(json[0].lat), country: json[0].address?.country_code ?? "?" } : null;
}

/** Settlement in Germany if one exists with this name; otherwise the best settlement worldwide (with its country). */
async function geocode(cities: string[]) {
  const cachePath = join(RAW, "geocode-cache-v2.json");
  const cache: Record<string, Geo> = existsSync(cachePath) ? readJson(cachePath) : {};
  for (const city of cities) {
    if (city in cache) continue;
    // "Friedberg (Hessen)" → "Friedberg, Hessen"; "Lambaréné (Gabon)" → "Lambaréné, Gabon"
    const m = city.match(/^(.*?)s*((.*))$/);
    const q = m ? `${m[1]}, ${m[2]}` : city;
    try {
      cache[city] = (await nominatim(q, true)) ?? (await nominatim(q, false));
      console.log(`geocoded ${city}: ${cache[city] ? `${cache[city]!.lat}, ${cache[city]!.lon} (${cache[city]!.country})` : "not found"}`);
    } catch (e) {
      console.warn(`geocode failed for ${city}: ${(e as Error).message}`);
    }
    writeJson(cachePath, cache);
  }
  return cache;
}

async function main() {
  const countries = require("world-atlas/countries-50m.json") as Topology;
  const land = require("world-atlas/land-110m.json") as Topology;
  const fc = feature(countries, countries.objects.countries as GeometryCollection) as unknown as {
    features: { id: string; properties: { name: string }; geometry: Geometry }[];
  };
  const germany = fc.features.find((f) => f.id === "276");
  const india = fc.features.find((f) => f.id === "356");
  if (!germany || !india) throw new Error("Germany or India not found in world-atlas");

  const landFc = feature(land, land.objects.land as GeometryCollection) as unknown as { features: { geometry: Geometry }[] };
  // Only rings that overlap our Europe–South Asia window; Antarctica (which wraps the globe) is dropped.
  const inWindow = (ring: Ring) => {
    const lons = ring.map((p) => p[0]);
    const lats = ring.map((p) => p[1]);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats);
    return minLat > -60 && maxLon > -20 && minLon < 110 && maxLat > 0 && minLat < 70;
  };
  const worldLand = landFc.features.map((f) => toPath(f.geometry, projectWorld, 4, inWindow)).join("");

  writeJson(join(OUT, "map.json"), {
    source: "Natural Earth via world-atlas (public domain)",
    germany: { viewBox: `0 0 ${DE.width} ${DE.height}`, path: toPath(germany.geometry, projectDE, 6) },
    world: {
      viewBox: `0 0 ${WORLD.width} ${WORLD.height}`,
      land: worldLand,
      germany: toPath(germany.geometry, projectWorld),
      india: toPath(india.geometry, projectWorld),
      // Main departure cities in India and a central point in Germany for the flight arcs.
      origins: (
        [
          ["New Delhi", 77.21, 28.61],
          ["Mumbai", 72.88, 19.08],
          ["Bengaluru", 77.59, 12.97],
          ["Hyderabad", 78.49, 17.39],
          ["Chennai", 80.27, 13.08],
          ["Kolkata", 88.36, 22.57],
        ] as const
      ).map(([name, lon, lat]) => ({ name, xy: projectWorld(lon, lat) })),
      destination: { name: "Germany", xy: projectWorld(10.4, 51.2) },
    },
  });

  const listing = readJson<{ entries: ListingEntry[] }>(join(RAW, "daad_listing.json")).entries;
  const cities = [...new Set(listing.map((e) => e.city).filter(Boolean))].sort();
  const coords = await geocode(cities);
  const out: Record<string, { lon: number; lat: number; country: string; x: number; y: number } | null> = {};
  for (const c of cities) {
    const g = coords[c];
    out[c] = g ? { lon: g.lon, lat: g.lat, country: g.country, x: projectDE(g.lon, g.lat)[0], y: projectDE(g.lon, g.lat)[1] } : null;
  }
  writeJson(join(OUT, "cities.json"), { source: "© OpenStreetMap contributors (Nominatim)", cities: out });
  console.log(`map written; ${Object.values(out).filter(Boolean).length}/${cities.length} cities located`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
