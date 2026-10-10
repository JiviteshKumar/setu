// Re-checks every published fact against its official source.
//   1. Every source URL must still load.
//   2. Every anchor phrase of every fact must still appear on its source page.
// A failure means the official page changed (or moved) and a human must re-verify the fact before the next release.
// Exit code 1 when a fact no longer matches its source (a person must re-verify), so this can block a deploy or
// trigger an alert. Exit code 3 when the only problem is unreachable sources (network trouble): nothing is known
// to be wrong, but those facts were not re-checked this time.
//
//   npm run check:facts
import { join } from "node:path";
import { FACTS } from "../src/content/facts.ts";
import { SOURCES, type SourceKey } from "../src/content/sources.ts";
import { OUT, fetchPageText, writeJson } from "./lib.ts";

async function loadText(url: string): Promise<string> {
  const page = await fetchPageText(url, 5); // official sites sometimes reset or time out; retry patiently
  return page.lines.join(" ");
}

async function main() {
  const pages = new Map<SourceKey, { text?: string; error?: string }>();
  const skipped: string[] = [];
  for (const key of Object.keys(SOURCES) as SourceKey[]) {
    const src: { url: string; linkOnly?: string } = SOURCES[key];
    if (src.linkOnly) {
      skipped.push(`${src.url} (${src.linkOnly})`);
      continue;
    }
    try {
      pages.set(key, { text: await loadText(SOURCES[key].url) });
    } catch (e) {
      pages.set(key, { error: (e as Error).message });
    }
  }

  const problems: { fact?: string; source: string; problem: string }[] = [];
  for (const [key, page] of pages) {
    if (page.error) problems.push({ source: SOURCES[key].url, problem: `source unreachable: ${page.error}` });
  }
  for (const fact of FACTS) {
    if (!fact.anchors.length) problems.push({ fact: fact.id, source: "-", problem: "fact has no anchors — it cannot be checked automatically" });
    for (const a of fact.anchors) {
      const page = pages.get(a.source);
      if (!page?.text) continue; // unreachable already reported
      if (!new RegExp(a.pattern, "i").test(page.text)) {
        problems.push({ fact: fact.id, source: SOURCES[a.source].url, problem: `anchor "${a.pattern}" no longer found — the official page changed` });
      }
    }
    if (!fact.sources.every((s) => s in SOURCES)) problems.push({ fact: fact.id, source: "-", problem: "unknown source key" });
    for (const s of fact.sources) {
      if ((SOURCES[s] as { linkOnly?: string }).linkOnly) problems.push({ fact: fact.id, source: SOURCES[s].url, problem: "facts must not rely on a link-only source" });
    }
  }

  const report = { checkedAt: new Date().toISOString(), facts: FACTS.length, sources: pages.size, skipped, problems };
  for (const s of skipped) console.warn(`! not auto-checked (link only): ${s}`);
  writeJson(join(OUT, "fact-check-report.json"), report);
  if (problems.length) {
    console.error(`✗ ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p.fact ?? "(source)"}: ${p.problem}\n    ${p.source}`);
    const onlyUnreachable = problems.every((p) => !p.fact && p.problem.startsWith("source unreachable"));
    if (onlyUnreachable) console.error("(No fact failed its check; these sources could not be reached and were not re-checked.)");
    process.exit(onlyUnreachable ? 3 : 1);
  }
  console.log(`✓ All ${FACTS.length} facts still match their ${pages.size} official sources.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
