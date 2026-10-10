"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/community/db";
import { createLoginToken, currentUser, endSession, normaliseEmail } from "@/lib/community/auth";
import { sendSignInLink } from "@/lib/community/mail";
import { AUTO_HIDE_REPORTS, MAX_POSTS_PER_HOUR, checkContent } from "@/lib/community/moderation";

export type FormState = { ok?: string; error?: string; devLink?: string };

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").replace(/\s+\n/g, "\n").trim().slice(0, max);

const recentRequests = new Map<string, number[]>();
function throttle(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const list = (recentRequests.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) return false;
  recentRequests.set(key, [...list, now]);
  return true;
}

export async function requestSignIn(_: FormState, form: FormData): Promise<FormState> {
  const email = normaliseEmail(clean(form.get("email"), 200));
  const name = clean(form.get("name"), 40);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (name.length < 2) return { error: "Please choose a display name (at least 2 characters)." };
  if (/@/.test(name)) return { error: "Your display name shouldn't be an email address." };
  if (!throttle(`signin:${email}`, 3, 15 * 60_000)) return { error: "Too many sign-in requests. Please wait a few minutes." };
  // In production the link must point to our own address (SETU_SITE_URL) — never trust the request's Host header,
  // or a forged header could make us email a sign-in token to someone else's website.
  const h = await headers();
  const origin = process.env.SETU_SITE_URL?.replace(/\/$/, "") ?? (process.env.NODE_ENV === "production" ? null : `http://${h.get("host")}`);
  if (!origin) return { error: "Email sign-in is not set up on this server yet." };
  const token = createLoginToken(email, name);
  try {
    const res = await sendSignInLink(email, `${origin}/community/verify?token=${token}`);
    return { ok: "Check your inbox — we sent you a sign-in link (valid for 30 minutes).", ...res };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Please sign in first.");
  if (user.banned) throw new Error("Your account has been blocked by a moderator.");
  return user;
}

function postLimitReached(userId: string) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const db = getDb();
  const q = db.prepare("SELECT COUNT(*) AS n FROM questions WHERE user_id = ? AND created_at > ?").get(userId, since) as { n: number };
  const a = db.prepare("SELECT COUNT(*) AS n FROM answers WHERE user_id = ? AND created_at > ?").get(userId, since) as { n: number };
  return q.n + a.n >= MAX_POSTS_PER_HOUR;
}

export async function askQuestion(_: FormState, form: FormData): Promise<FormState> {
  try {
    const user = await requireUser();
    const title = clean(form.get("title"), 120);
    const body = clean(form.get("body"), 1500);
    const uni = clean(form.get("uni"), 200);
    if (title.length < 10) return { error: "Please write a question title of at least 10 characters." };
    if (body.length < 20) return { error: "Please add a bit more detail (at least 20 characters)." };
    if (postLimitReached(user.id)) return { error: "You've posted a lot in the last hour. Please try again later." };
    const [uniId, uniName] = uni ? uni.split("|") : [null, null];
    const flags = checkContent(`${title}\n${body}`);
    getDb()
      .prepare("INSERT INTO questions (user_id, uni_id, uni_name, title, body, status, flags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(user.id, uniId, uniName, title, body, flags.length ? "held" : "visible", flags.map((f) => f.label).join("; "), new Date().toISOString());
    refresh();
    return flags.length
      ? { ok: `Your question is waiting for a moderator because it ${flags.map((f) => f.label.toLowerCase()).join(", ")}. For your safety, keep contact details and payments out of public posts.` }
      : { ok: "Your question is posted." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function answerQuestion(_: FormState, form: FormData): Promise<FormState> {
  try {
    const user = await requireUser();
    if (!user.verified_uni_id) return { error: "Only students signed in with a German public-university email can answer." };
    const questionId = Number(form.get("questionId"));
    const body = clean(form.get("body"), 2000);
    if (body.length < 20) return { error: "Please write an answer of at least 20 characters." };
    if (postLimitReached(user.id)) return { error: "You've posted a lot in the last hour. Please try again later." };
    const exists = getDb().prepare("SELECT id FROM questions WHERE id = ? AND status = 'visible'").get(questionId);
    if (!exists) return { error: "This question is not available." };
    const flags = checkContent(body);
    getDb()
      .prepare("INSERT INTO answers (question_id, user_id, body, status, flags, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(questionId, user.id, body, flags.length ? "held" : "visible", flags.map((f) => f.label).join("; "), new Date().toISOString());
    refresh();
    return flags.length ? { ok: "Your answer is waiting for a moderator (it contains contact details, payment wording or a non-official link)." } : { ok: "Thank you — your answer is posted." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function reportPost(_: FormState, form: FormData): Promise<FormState> {
  try {
    const user = await requireUser();
    const type = form.get("type") === "answer" ? "answer" : "question";
    const id = Number(form.get("id"));
    const reason = clean(form.get("reason"), 300) || "No reason given";
    const db = getDb();
    db.prepare("INSERT OR IGNORE INTO reports (target_type, target_id, user_id, reason, created_at) VALUES (?, ?, ?, ?, ?)").run(type, id, user.id, reason, new Date().toISOString());
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM reports WHERE target_type = ? AND target_id = ? AND resolved = 0").get(type, id) as { n: number };
    if (n >= AUTO_HIDE_REPORTS) db.prepare(`UPDATE ${type === "answer" ? "answers" : "questions"} SET status = 'held' WHERE id = ?`).run(id);
    refresh();
    return { ok: "Thanks — a moderator will review it." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function signOut() {
  await endSession();
  redirect("/connect/ask");
}

/** Deletes the account, all its questions and answers, sessions and reports (privacy: right to erasure). */
export async function deleteAccount() {
  const user = await requireUser();
  const db = getDb();
  // Reports about this user's posts, pending sign-in links (they hold the email), then the user (posts/sessions cascade).
  db.prepare(
    `DELETE FROM reports WHERE (target_type = 'question' AND target_id IN (SELECT id FROM questions WHERE user_id = ?))
       OR (target_type = 'answer' AND target_id IN (SELECT id FROM answers WHERE user_id = ? OR question_id IN (SELECT id FROM questions WHERE user_id = ?)))`,
  ).run(user.id, user.id, user.id);
  db.prepare("DELETE FROM login_tokens WHERE email = (SELECT email FROM users WHERE id = ?)").run(user.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  await endSession();
  redirect("/connect/ask?deleted=1");
}
