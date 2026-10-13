// City guides from OpenStreetMap (© OpenStreetMap contributors, ODbL) via the public Overpass API.
// For every city with a public-university Master's programme: supermarkets, Indian/Asian groceries, Indian restaurants,
// Hindu temples and gurdwaras, pharmacies, hospitals and the main railway station.
//
// Fair use: one small radius query per city, strictly one at a time with pauses, cached in data/raw/osm/city-*.json
// (resumable). Output: data/city-guides.json.
//
//   npm run data:cities              # uses cached downloads if present
//   npm run data:cities -- --refresh # download again (do this rarely — e.g. once a month)
//   npm run data:cities -- --cached-only    # build pages only from cities already downloaded
//   npm run data:cities -- --max-new 20     # fetch at most 20 missing cities this run (used by the weekly job)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OUT, RAW, USER_AGENT, ensureDir, normalizeName, readJson, sleep, writeJson } from "./lib.ts";

// Main instance first, then a public mirror listed on the OSM wiki.
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const ETHNIC = "india|indian|indisch|asia|asian|desi|bharat|spice|masala|bazaar|bazar|oriental|tamil|punjab|kerala|bengal|nepal|sri lanka";
// One small query per city (radius around its centre), strictly one at a time with pauses. Nationwide or per-state
// queries are too heavy for the free public instances; small queries are the fair-use option.
const cityQuery = (lat: number, lon: number) => {
  const a = (km: number) => `(around:${km * 1000},${lat},${lon})`;
  return `[out:json][timeout:120];(
nwr${a(RADIUS.supermarket)}[shop=supermarket];
nwr${a(RADIUS.pharmacy)}[amenity=pharmacy];
nwr${a(RADIUS.restaurant)}[amenity=restaurant][cuisine~"indian|nepalese|sri_lankan|pakistani",i];
nwr${a(RADIUS.worship)}[amenity=place_of_worship][religion~"hindu|sikh"];
nwr${a(RADIUS.grocery)}[shop~"supermarket|convenience|deli|greengrocer|spices"][name~"${ETHNIC}",i];
nwr${a(RADIUS.hospital)}[amenity=hospital][name];
nwr${a(RADIUS.station)}[railway=station][name];
);out center tags;`;
};

// Search radius around the city centre per category (km).
const RADIUS = { supermarket: 4, grocery: 7, restaurant: 7, worship: 15, pharmacy: 3, hospital: 6, station: 8 };

export const slugify = (city: string) => normalizeName(city).replace(/ /g, "-");

type OsmEl = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
export type Poi = { name: string; lat: number; lon: number; km: number; osm: string; brand?: string; detail?: string };
export type CityGuide = {
  city: string;
  slug: string;
  lat: number;
  lon: number;
  supermarkets: { total: number; brands: Record<string, number>; nearest: Poi[] };
  groceries: Poi[]; // names suggest Indian / Asian groceries
  restaurants: Poi[]; // cuisine=indian (and neighbouring cuisines)
  worship: Poi[]; // Hindu temples, gurdwaras
  pharmacies: number;
  hospitals: Poi[];
  station: Poi | null;
};

async function overpass(q: string): Promise<{ elements: OsmEl[] }> {
  let last = "";
  for (let round = 0; round < 3; round++) {
    for (const ep of ENDPOINTS) {
      try {
        console.log(`  querying ${ep} …`);
        const res = await fetch(ep, {
          method: "POST",
          headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(q)}`,
          signal: AbortSignal.timeout(20 * 60_000),
        });
        const text = await res.text();
        if (!res.ok || !text.startsWith("{")) throw new Error(`HTTP ${res.status}`);
        return JSON.parse(text);
      } catch (e) {
        last = `${ep}: ${(e as Error).message}`;
        console.warn(`  ✗ ${last}`);
        await sleep(10_000);
      }
    }
    await sleep(60_000 * (round + 1));
  }
  throw new Error(`all Overpass endpoints failed (${last})`);
}

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

const pos = (e: OsmEl) => e.center ?? (e.lat != null && e.lon != null ? { lat: e.lat, lon: e.lon } : null);

function toPoi(e: OsmEl, lat: number, lon: number): Poi | null {
  const p = pos(e);
  if (!p || !e.tags?.name) return null;
  return {
    name: e.tags.name,
    lat: p.lat,
    lon: p.lon,
    km: km(lat, lon, p.lat, p.lon),
    osm: `https://www.openstreetmap.org/${e.type}/${e.id}`,
    ...(e.tags.brand ? { brand: e.tags.brand } : {}),
  };
}

const BRANDS = ["Aldi", "Lidl", "Rewe", "Edeka", "Penny", "Netto", "Kaufland", "Norma", "Globus", "Denns", "Alnatura"];

/** Elements within `maxKm` of the centre (quick latitude/longitude box first, exact distance after). */
function near(els: OsmEl[], lat: number, lon: number, maxKm: number) {
  const dLat = maxKm / 110.57;
  const dLon = maxKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return els.filter((e) => {
    const p = pos(e);
    return p && Math.abs(p.lat - lat) <= dLat && Math.abs(p.lon - lon) <= dLon && km(lat, lon, p.lat, p.lon) <= maxKm;
  });
}

function summarise(city: string, lat: number, lon: number, rare: OsmEl[], supers: OsmEl[], pharmacies: OsmEl[]): CityGuide {
  const byKm = (a: Poi, b: Poi) => a.km - b.km;
  const uniq = (xs: Poi[]) => xs.filter((x, i) => xs.findIndex((y) => y.name === x.name && Math.abs(y.km - x.km) < 0.15) === i);
  const pois = (els: OsmEl[], r: number, pred: (t: Record<string, string>) => boolean) =>
    uniq(near(els, lat, lon, r).filter((e) => pred(e.tags ?? {})).map((e) => toPoi(e, lat, lon)).filter((p): p is Poi => !!p)).sort(byKm);
  const ethnic = new RegExp(ETHNIC, "i");

  const superPois = pois(supers, RADIUS.supermarket, () => true);
  const brands: Record<string, number> = {};
  for (const e of near(supers, lat, lon, RADIUS.supermarket)) {
    const t = e.tags ?? {};
    const b = BRANDS.find((x) => new RegExp(`\\b${x}`, "i").test(`${t.brand ?? ""} ${t.name ?? ""}`));
    if (b) brands[b] = (brands[b] ?? 0) + 1;
  }
  const stations = pois(rare, RADIUS.station, (t) => t.railway === "station");
  const main = stations.find((s) => /hauptbahnhof|\bhbf\b/i.test(s.name)) ?? stations[0] ?? null;
  return {
    city,
    slug: slugify(city),
    lat,
    lon,
    supermarkets: { total: near(supers, lat, lon, RADIUS.supermarket).length, brands, nearest: superPois.slice(0, 8) },
    groceries: pois(rare, RADIUS.grocery, (t) => !!t.shop && ethnic.test(t.name ?? "")).slice(0, 15),
    restaurants: pois(rare, RADIUS.restaurant, (t) => t.amenity === "restaurant").slice(0, 12),
    worship: pois(rare, RADIUS.worship, (t) => t.amenity === "place_of_worship").map((p) => {
      const e = rare.find((x) => `https://www.openstreetmap.org/${x.type}/${x.id}` === p.osm);
      return { ...p, detail: e?.tags?.religion === "sikh" ? "Gurdwara (Sikh)" : "Hindu temple" };
    }).slice(0, 8),
    pharmacies: near(pharmacies, lat, lon, RADIUS.pharmacy).length,
    hospitals: pois(rare, RADIUS.hospital, (t) => t.amenity === "hospital").slice(0, 5),
    station: main,
  };
}

let newDownloads = 0;

async function loadCity(city: string, lat: number, lon: number, refresh: boolean, cachedOnly: boolean, maxNew: number): Promise<OsmEl[] | null> {
  const file = join(RAW, "osm", `city-${slugify(city)}.json`);
  if (existsSync(file) && !refresh) return JSON.parse(readFileSync(file, "utf-8")).elements;
  if (cachedOnly || newDownloads >= maxNew) return null; // not downloaded yet
  newDownloads++;
  const data = await overpass(cityQuery(lat, lon));
  writeFileSync(file, JSON.stringify(data));
  await sleep(5_000); // pause between queries on a shared, free service
  return data.elements;
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  const cachedOnly = process.argv.includes("--cached-only");
  const maxIdx = process.argv.indexOf("--max-new");
  const maxNew = maxIdx > 0 ? Number(process.argv[maxIdx + 1]) : Infinity; // gentle incremental runs, e.g. weekly
  ensureDir(join(RAW, "osm"));
  const { programmes } = readJson<{ programmes: { city: string }[] }>(join(OUT, "programmes.json"));
  const { cities: coords } = readJson<{ cities: Record<string, { lon: number; lat: number; country?: string } | null> }>(join(OUT, "cities.json"));
  const cities = [...new Set(programmes.map((p) => p.city))]
    .filter((c) => {
      const ll = coords[c];
      return ll && (ll.country ? ll.country === "de" : ll.lon > 5.8 && ll.lon < 15.1 && ll.lat > 47.2 && ll.lat < 55.1); // only cities in Germany
    })
    .sort();

  // Guides already built are kept when their raw download isn't on this machine (e.g. the weekly cloud run, which
  // starts without data/raw): only missing cities are downloaded, existing guides are never thrown away.
  const guidesFile = join(OUT, "city-guides.json");
  const prevFile = existsSync(guidesFile) ? readJson<{ builtAt: string; cities: CityGuide[] }>(guidesFile) : null;
  const existing = new Map((prevFile?.cities ?? []).map((g) => [g.city, g]));
  // The date shown as "checked" only moves when something was actually downloaded again.
  const save = (list: CityGuide[]) =>
    writeJson(guidesFile, {
      builtAt: newDownloads || !prevFile ? new Date().toISOString() : prevFile.builtAt,
      source: "© OpenStreetMap contributors, ODbL — via the Overpass API",
      cities: [...list, ...[...existing.values()].filter((g) => !list.some((x) => x.city === g.city) && cities.includes(g.city))],
    });
  const guides: CityGuide[] = [];
  const missing: string[] = [];
  for (const [i, city] of cities.entries()) {
    const { lat, lon } = coords[city]!;
    const cached = existsSync(join(RAW, "osm", `city-${slugify(city)}.json`));
    if (!cached && !refresh && existing.has(city)) {
      guides.push(existing.get(city)!);
      continue;
    }
    try {
      const els = await loadCity(city, lat, lon, refresh, cachedOnly, maxNew);
      if (!els) {
        if (existing.has(city)) guides.push(existing.get(city)!);
        else missing.push(city);
        continue;
      }
      const supers = els.filter((e) => e.tags?.shop === "supermarket");
      const pharmacies = els.filter((e) => e.tags?.amenity === "pharmacy");
      guides.push(summarise(city, lat, lon, els, supers, pharmacies));
    } catch (e) {
      if (existing.has(city)) guides.push(existing.get(city)!);
      else missing.push(city);
      console.warn(`✗ ${city}: ${(e as Error).message}`);
    }
    if ((i + 1) % 10 === 0) {
      console.log(`progress ${i + 1}/${cities.length}`);
      // Save progress so finished cities appear even if a later one fails.
      save(guides);
    }
  }
  // Cities that failed are simply left out (no city shows partial data); run again later to fill them in.
  save(guides);
  console.log(`city guides: ${guides.length}/${cities.length} cities${missing.length ? ` (missing: ${missing.join(", ")} — run again to retry)` : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
