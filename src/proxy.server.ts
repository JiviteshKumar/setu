import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse, type NextRequest } from "next/server";

// Pages for a course, a city or a question stream their content, so an unknown id would otherwise answer
// "200 OK" with a not-found message inside. This checks the id against the data first and answers a real 404.
// The moderation pages also answer 404 to anyone who isn't a moderator (the pages and actions check again).

/** Reads a JSON data file once and again only when it changes on disk (after a data refresh). */
function cachedIds(path: string, pick: (json: never) => (string | number)[]) {
  let mtime = -1;
  let ids = new Set<string>();
  return () => {
    const m = existsSync(path) ? statSync(path).mtimeMs : 0;
    if (m !== mtime) {
      mtime = m;
      ids = new Set(m ? pick(JSON.parse(readFileSync(path, "utf-8")) as never).map(String) : []);
    }
    return ids;
  };
}

const programmeIds = cachedIds(join(process.cwd(), "data", "programmes.json"), (d: { programmes: { id: number }[] }) => d.programmes.map((p) => p.id));
const citySlugs = cachedIds(join(process.cwd(), "data", "city-guides.json"), (d: { cities: { slug: string }[] }) => d.cities.map((c) => c.slug));

let db: DatabaseSync | null = null;
function questionExists(id: number) {
  try {
    db ??= new DatabaseSync(process.env.SETU_COMMUNITY_DB ?? join(process.cwd(), "data", "community.db"), { readOnly: true });
    // Hidden posts are gone for everyone; held posts stay reachable (their author may view them).
    return !!db.prepare("SELECT 1 FROM questions WHERE id = ? AND status != 'hidden'").get(id);
  } catch {
    return false; // no database (or no tables) yet = no questions yet
  }
}

/** Same rule as isModerator() in src/lib/community/auth.ts: everyone in development, the ADMIN_TOKEN cookie in production. */
function moderator(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") return true;
  const token = process.env.ADMIN_TOKEN ?? "";
  return token.length >= 24 && req.cookies.get("setu_admin")?.value === createHash("sha256").update(token).digest("hex");
}

function known(req: NextRequest): boolean {
  const path = req.nextUrl.pathname;
  const [, section, a, b] = path.split("/");
  if (section === "moderate") return a === "login" || moderator(req);
  if (section === "programmes") return programmeIds().has(a);
  if (section === "cities") return citySlugs().has(a);
  if (section === "connect" && a === "ask") return /^[1-9]\d{0,9}$/.test(b) && questionExists(Number(b));
  return true;
}

export function proxy(req: NextRequest) {
  if (known(req)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found-page", req.url), { status: 404 });
}

export const config = {
  matcher: ["/programmes/:id", "/cities/:slug", "/connect/ask/:id", "/moderate", "/moderate/:path*"],
};
