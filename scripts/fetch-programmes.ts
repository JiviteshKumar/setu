// Downloads the DAAD "International Programmes" master's listing and every programme's
// detail page. Raw pages are cached in data/raw/daad so the crawl is resumable and we
// never hit DAAD more than once per page. Delete the cache folder to force a refresh.
//
//   node scripts/fetch-programmes.ts            # list + all details
//   node scripts/fetch-programmes.ts --limit 20 # quick test
//   node scripts/fetch-programmes.ts --refresh  # weekly refresh: re-download pages older than a day
import { join } from "node:path";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { RAW, fetchText, fetchCached, writeJson, sleep } from "./lib.ts";

const BASE = "https://www2.daad.de/deutschland/studienangebote/international-programmes";
const PAGE_SIZE = 100;
const DELAY_MS = 1000; // be polite: at most one request per second

export type ListingEntry = {
  id: number;
  courseName: string;
  academy: string;
  city: string;
  languages: string[];
  beginning: string;
  programmeDuration: string;
  tuitionFees: string | null;
  subject: string;
  isElearning: boolean;
  link: string;
};

function searchUrl(offset: number) {
  // degree[]=2 is "Master" in DAAD's search filter.
  return `${BASE}/api/solr/en/search.json?degree%5B%5D=2&q=&sort=4&display=list&limit=${PAGE_SIZE}&offset=${offset}`;
}

async function main() {
  const limitArg = process.argv.indexOf("--limit");
  const refresh = process.argv.includes("--refresh");
  const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

  const listing: ListingEntry[] = [];
  let total = Infinity;
  for (let offset = 0; offset < total && listing.length < limit; offset += PAGE_SIZE) {
    const json = JSON.parse(await fetchText(searchUrl(offset)));
    total = json.numResults;
    for (const c of json.courses) {
      listing.push({
        id: c.id,
        courseName: c.courseName,
        academy: c.academy,
        city: c.city,
        languages: c.languages ?? [],
        beginning: c.beginning,
        programmeDuration: c.programmeDuration,
        tuitionFees: c.tuitionFees,
        subject: c.subject,
        isElearning: !!c.isElearning,
        link: c.link,
      });
    }
    console.log(`listing: ${listing.length}/${total}`);
    await sleep(DELAY_MS);
  }
  const entries = listing.slice(0, limit);
  writeJson(join(RAW, "daad_listing.json"), { fetchedAt: new Date().toISOString(), total, entries });

  let downloaded = 0;
  let failed = 0;
  for (const [i, e] of entries.entries()) {
    const url = `${BASE}/en/detail/${e.id}/`;
    try {
      const file = join(RAW, "daad", `${e.id}.html`);
      // --refresh re-downloads pages older than a day so changes on DAAD are picked up (still 1 request/second).
      // The old copy is only replaced after the new one downloaded, so a network error never looks like a removed course.
      if (refresh && existsSync(file) && Date.now() - statSync(file).mtimeMs > 86_400_000) {
        writeFileSync(file, await fetchText(url));
        downloaded++;
        await sleep(DELAY_MS);
        continue;
      }
      const { fresh } = await fetchCached(url, file);
      if (fresh) {
        downloaded++;
        await sleep(DELAY_MS);
      }
    } catch (err) {
      failed++;
      console.warn(`detail ${e.id} failed: ${(err as Error).message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`details: ${i + 1}/${entries.length} (new ${downloaded}, failed ${failed})`);
  }
  console.log(`Done. ${entries.length} programmes, ${downloaded} newly downloaded, ${failed} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
