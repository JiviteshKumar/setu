"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, consumeLoginToken, createSession } from "@/lib/community/auth";

/** Spends the single-use sign-in token (only on a deliberate button press) and starts a session. */
export async function completeSignIn(form: FormData) {
  const token = String(form.get("token") ?? "");
  const result = token ? consumeLoginToken(token) : null;
  if (!result) redirect("/connect/ask?signin=expired");
  const { token: session, maxAge } = createSession(result.userId);
  (await cookies()).set(SESSION_COOKIE, session, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
  redirect("/connect/ask?signin=ok");
}
