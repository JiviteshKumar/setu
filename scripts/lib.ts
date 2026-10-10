// Shared helpers for the data pipeline. Run scripts with plain `node` (Node 24 strips TS types).
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const RAW = join(ROOT, "data", "raw");
export const OUT = join(ROOT, "data");

// Identify ourselves honestly to the sites we read from.
// Identify ourselves honestly. Set SETU_CONTACT (an email or project URL) before running these scripts publicly —
// services like Overpass expect a way to contact the operator.
export const USER_AGENT = `SetuGermanyBot/0.1 (+${process.env.SETU_CONTACT ?? "contact: not-yet-public"}; non-commercial student information project)`;

export function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

export function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

export function writeJson(p: string, data: unknown) {
  ensureDir(dirname(p));
  writeFileSync(p, JSON.stringify(data, null, 1));
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchText(url: string, tries = 3): Promise<string> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      if (i >= tries) throw err;
      await sleep(2000 * i);
    }
  }
}

/** Cache-aware fetch: returns the cached copy if it exists, otherwise downloads and stores it. */
export async function fetchCached(url: string, file: string): Promise<{ text: string; fresh: boolean }> {
  if (existsSync(file)) return { text: readFileSync(file, "utf-8"), fresh: false };
  const text = await fetchText(url);
  ensureDir(dirname(file));
  writeFileSync(file, text);
  return { text, fresh: true };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Strip tags but keep line structure from <br>, <p>, <li>. */
export function htmlToText(s: string): string {
  const withBreaks = s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(withBreaks)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** "https://www.math.rptu.de/x" -> "rptu.de" (good enough for German .de university domains). */
export function registrableDomain(url: string): string | null {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
    const parts = host.split(".").filter(Boolean);
    if (parts.length < 2) return null;
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // drop combining accent marks left by NFKD
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Downloads an official page and returns its visible text as lines (scripts/styles removed, charset honoured).
 * Retries transient network errors so a flaky connection doesn't raise false alarms. PDFs return no lines.
 */
export async function fetchPageText(url: string, tries = 3): Promise<{ lines: string[]; pdf: boolean; sha256?: string }> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf;q=0.9,*/*;q=0.8" }, redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      const buf = Buffer.from(await res.arrayBuffer());
      // PDFs: no text extraction, but a fingerprint so a new version of an official document is noticed.
      if (type.includes("pdf")) return { lines: [], pdf: true, sha256: createHash("sha256").update(buf).digest("hex") };
      // German law pages are served as ISO-8859-1; honour the declared charset.
      const charset =
        /charset=([\w-]+)/i.exec(type)?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(buf.subarray(0, 2048).toString("latin1"))?.[1] ?? "utf-8";
      const html = new TextDecoder(charset.toLowerCase() === "iso-8859-1" ? "latin1" : charset).decode(buf);
      return { lines: htmlToText(html).split("\n"), pdf: false };
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(3000 * i);
    }
  }
}
