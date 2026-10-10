import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { connection, type NextRequest } from "next/server";

// "Report a mistake": stores the report in the review queue (data/watch/reports). No personal data is asked for or stored.
const DIR = join(process.cwd(), "data", "watch", "reports");
const recent = new Map<string, number>(); // simple per-IP throttle

export async function POST(req: NextRequest) {
  await connection();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  if (now - (recent.get(ip) ?? 0) < 30_000) return Response.json({ error: "Please wait a moment before sending another report." }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.website) return Response.json({ ok: true }); // honeypot field — bots fill it, people never see it
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const message = text(body.message, 1000);
  const page = text(body.page, 300);
  const sourceUrl = text(body.sourceUrl, 500);
  if (message.length < 10) return Response.json({ error: "Please describe what is wrong (at least 10 characters)." }, { status: 400 });
  if (!page.startsWith("/")) return Response.json({ error: "Invalid page" }, { status: 400 });
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) return Response.json({ error: "The source must be a web link." }, { status: 400 });

  const createdAt = new Date().toISOString();
  const id = `report-${createdAt.replace(/[:.]/g, "-")}`;
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(
      join(DIR, `${id}.json`),
      JSON.stringify({ id, createdAt, page, context: text(body.context, 200), message, correction: text(body.correction, 1000), sourceUrl }, null, 1),
    );
  } catch {
    return Response.json({ error: "Reports can't be saved on this server yet." }, { status: 503 });
  }
  recent.set(ip, now);
  return Response.json({ ok: true });
}
