// Reads every course's own page on the university website (the link DAAD lists) and stores the sentences that state
// the application deadline. Runs weekly in the cloud (pages.yml); "Check university pages" in My plan compares them
// with DAAD's deadlines, so a change the university made before DAAD caught up is noticed.
//
//   npm run data:unipages             # all courses (~1,600 pages on ~650 university sites, about 15 minutes)
//   npm run data:unipages -- --limit 30
//
// Polite by design: robots.txt is honoured, at most one request every 2 seconds per university site, a clear
// User-Agent, and pages are only read (no forms, no logins).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { OUT, USER_AGENT, htmlToText, readJson, sleep, writeJson } from "./lib.ts";
import { findDeadlines, type UniPage } from "../src/lib/uniDeadlines.ts";

const FILE = join(OUT, "uni-pages.json");
const PER_HOST_DELAY_MS = 2000;
const PARALLEL_HOSTS = 12;
const TIMEOUT_MS = 20_000;
const MAX_BYTES = 4_000_000;

type Store = { checkedAt: string; pages: Record<string, UniPage> };

// ── robots.txt ──
const robotsCache = new Map<string, RegExp[]>();
async function disallowed(url: URL): Promise<boolean> {
  if (!robotsCache.has(url.origin)) {
    let rules: RegExp[] = [];
    try {
      const res = await fetch(`${url.origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.ok) rules = parseRobots(await res.text());
    } catch {
      // No robots.txt reachable: nothing is disallowed.
    }
    robotsCache.set(url.origin, rules);
  }
  const path = url.pathname + url.search;
  return robotsCache.get(url.origin)!.some((r) => r.test(path));
}

/** Disallow rules that apply to us: the group for our bot if there is one, otherwise the group for "*". */
export function parseRobots(text: string): RegExp[] {
  const groups: { agents: string[]; disallow: string[] }[] = [];
  let current: { agents: string[]; disallow: string[] } | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], disallow: [] }));
      current.agents.push(m[2].toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === "disallow" && current && m[2]) current.disallow.push(m[2]);
  }
  const ours = groups.filter((g) => g.agents.some((a) => a.includes("setugermanybot")));
  const chosen = ours.length ? ours : groups.filter((g) => g.agents.includes("*"));
  return chosen
    .flatMap((g) => g.disallow)
    .map((p) => new RegExp(`^${p.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\$(?!$)/g, "\\$")}`)); // "*" is a wildcard, a final "$" ends the path
}

async function readPage(url: string): Promise<{ status: UniPage["status"]; lines: string[] }> {
  const u = new URL(url);
  if (await disallowed(u)) return { status: "blocked", lines: [] };
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!(res.headers.get("content-type") ?? "").includes("html")) return { status: "unreadable", lines: [] };
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > MAX_BYTES) return { status: "unreadable", lines: [] };
      const type = res.headers.get("content-type") ?? "";
      const charset = /charset=([\w-]+)/i.exec(type)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 2048).toString("latin1"))?.[1] ?? "utf-8";
      let html: string;
      try {
        html = new TextDecoder(charset.toLowerCase() === "iso-8859-1" ? "latin1" : charset).decode(buf);
      } catch {
        html = new TextDecoder("utf-8").decode(buf);
      }
      const lines = htmlToText(html).split("\n");
      return { status: lines.join(" ").length < 300 ? "unreadable" : "ok", lines };
    } catch (e) {
      if (attempt >= 2) throw e;
      await sleep(5000);
    }
  }
}

async function main() {
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx > 0 ? Number(process.argv[limitIdx + 1]) : Infinity;
  const { programmes } = readJson<{ programmes: { id: number; courseWebsite: string }[] }>(join(OUT, "programmes.json"));
  const prev: Store = existsSync(FILE) ? readJson(FILE) : { checkedAt: "", pages: {} };
  const now = new Date().toISOString();

  const byHost = new Map<string, { id: number; url: string }[]>();
  for (const p of programmes.slice(0, limit)) {
    let host: string;
    try {
      host = new URL(p.courseWebsite).host;
    } catch {
      continue;
    }
    (byHost.get(host) ?? byHost.set(host, []).get(host)!).push({ id: p.id, url: p.courseWebsite });
  }

  const pages: Record<string, UniPage> = {};
  const counts = { ok: 0, unreadable: 0, blocked: 0, error: 0, changed: 0 };
  const queue = [...byHost.values()];
  let done = 0;
  const total = queue.reduce((n, q) => n + q.length, 0);

  async function worker() {
    for (let host = queue.shift(); host; host = queue.shift()) {
      for (const { id, url } of host) {
        const old = prev.pages[id];
        let page: UniPage;
        try {
          const { status, lines } = await readPage(url);
          const found = status === "ok" ? findDeadlines(lines) : { snippets: [], dates: [] };
          page = { url, status, checkedAt: now, ...found };
          // Remember when the deadline sentences changed, and what they said before.
          const changed = old && old.url === url && old.status === "ok" && status === "ok" && old.snippets.join("\n") !== found.snippets.join("\n");
          if (changed) {
            page.changedAt = now;
            page.before = old.snippets;
            counts.changed++;
          } else if (old?.changedAt && old.url === url) {
            page.changedAt = old.changedAt;
            page.before = old.before;
          }
        } catch {
          // Unreachable this week: keep last week's reading, marked as such.
          page = old && old.url === url ? { ...old, status: "error" } : { url, status: "error", checkedAt: now, snippets: [], dates: [] };
        }
        pages[id] = page;
        counts[page.status]++;
        if (++done % 100 === 0) console.log(`${done}/${total}`);
        await sleep(PER_HOST_DELAY_MS);
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL_HOSTS }, worker));

  // Courses not checked this run (e.g. with --limit) keep their previous reading.
  for (const [id, p] of Object.entries(prev.pages)) if (!pages[id] && programmes.some((x) => String(x.id) === id)) pages[id] = p;
  writeJson(FILE, { checkedAt: now, pages } satisfies Store);
  const withDeadline = Object.values(pages).filter((p) => p.snippets.length).length;
  console.log(
    `university pages: ${counts.ok} read (${withDeadline} state a deadline), ${counts.unreadable} unreadable, ${counts.blocked} blocked by robots.txt, ${counts.error} unreachable; deadline text changed on ${counts.changed}`,
  );
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
