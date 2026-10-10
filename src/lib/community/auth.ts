import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cookies, headers } from "next/headers";
import { getDb, purgeExpired } from "./db";

export const SESSION_COOKIE = "setu_session";
const SESSION_DAYS = 30;
const LINK_MINUTES = 30;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export type User = { id: string; display_name: string; verified_uni_id: string | null; verified_uni_name: string | null; banned: number };

// Public universities' email domains (official HRK register + manually verified extras), for the "verified student" badge.
type Inst = { hrkId: string; name: string; displayName: string; isPublic: boolean; domain: string | null };
let domains: Map<string, { id: string; name: string }> | null = null;
function uniDomains() {
  if (domains) return domains;
  domains = new Map();
  const file = join(process.cwd(), "data", "institutions.json");
  if (existsSync(file)) {
    for (const i of (JSON.parse(readFileSync(file, "utf-8")).institutions as Inst[]).filter((x) => x.isPublic && x.domain)) {
      domains.set(i.domain!, { id: i.hrkId, name: i.displayName || i.name });
    }
  }
  domains.set("charite.de", { id: "x-charite", name: "Charité – Universitätsmedizin Berlin" });
  return domains;
}

/** "max@stud.rwth-aachen.de" → RWTH Aachen (matches the registrable domain, so student sub-domains count too). */
export function universityForEmail(email: string) {
  const host = email.split("@")[1]?.toLowerCase() ?? "";
  const parts = host.split(".");
  return parts.length >= 2 ? uniDomains().get(parts.slice(-2).join(".")) ?? null : null;
}

export function normaliseEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createLoginToken(email: string, displayName: string) {
  const token = randomBytes(32).toString("base64url");
  purgeExpired();
  getDb()
    .prepare("INSERT INTO login_tokens (token_hash, email, display_name, expires_at) VALUES (?, ?, ?, ?)")
    .run(sha(token), normaliseEmail(email), displayName, Date.now() + LINK_MINUTES * 60_000);
  return token;
}

/** Single-use, time-limited sign-in link → user (created on first sign-in). */
export function consumeLoginToken(token: string): { userId: string } | null {
  const db = getDb();
  const row = db.prepare("SELECT email, display_name, expires_at, used FROM login_tokens WHERE token_hash = ?").get(sha(token)) as
    | { email: string; display_name: string; expires_at: number; used: number }
    | undefined;
  if (!row || row.used || row.expires_at < Date.now()) return null;
  db.prepare("UPDATE login_tokens SET used = 1 WHERE token_hash = ?").run(sha(token));
  const uni = universityForEmail(row.email);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(row.email) as { id: string } | undefined;
  if (existing) {
    // Re-check the university on every sign-in (e.g. after graduating the badge disappears with the email).
    db.prepare("UPDATE users SET verified_uni_id = ?, verified_uni_name = ? WHERE id = ?").run(uni?.id ?? null, uni?.name ?? null, existing.id);
    return { userId: existing.id };
  }
  const id = randomUUID();
  db.prepare("INSERT INTO users (id, email, display_name, verified_uni_id, verified_uni_name, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    id,
    row.email,
    row.display_name,
    uni?.id ?? null,
    uni?.name ?? null,
    new Date().toISOString(),
  );
  return { userId: id };
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  getDb().prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha(token), userId, Date.now() + SESSION_DAYS * 86_400_000);
  return { token, maxAge: SESSION_DAYS * 86_400 };
}

/** Reads a cookie from the request headers. (Using headers() here avoids a Next.js 16 invariant error that
 * `cookies()` can throw when a page re-renders right after a server action.) */
async function readCookie(name: string): Promise<string | undefined> {
  const raw = (await headers()).get("cookie") ?? "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

export async function currentUser(): Promise<User | null> {
  const token = await readCookie(SESSION_COOKIE);
  if (!token) return null;
  const row = getDb()
    .prepare(
      "SELECT u.id, u.display_name, u.verified_uni_id, u.verified_uni_name, u.banned FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
    )
    .get(sha(token), Date.now()) as User | undefined;
  return row ?? null;
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha(token));
  store.delete(SESSION_COOKIE);
}

/** Moderators: everyone in local development; in production only with the ADMIN_TOKEN (set once via /moderate?key=…). */
export async function isModerator(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length < 24) return false;
  return (await readCookie("setu_admin")) === sha(expected);
}

export const adminCookieValue = (token: string) => sha(token);
