import { connection, NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { adminCookieValue } from "@/lib/community/auth";

// Production moderators sign in once with /moderate/login?key=<ADMIN_TOKEN> (a long random secret set on the server).
export async function GET(req: NextRequest) {
  await connection();
  const expected = process.env.ADMIN_TOKEN ?? "";
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const ok = expected.length >= 24 && key.length === expected.length && timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  if (!ok) return new NextResponse("Not found", { status: 404 });
  const res = NextResponse.redirect(new URL("/moderate", req.nextUrl.origin));
  res.cookies.set("setu_admin", adminCookieValue(expected), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 7 * 86_400, path: "/" });
  return res;
}
