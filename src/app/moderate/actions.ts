"use server";

import { refresh } from "next/cache";
import { getDb } from "@/lib/community/db";
import { isModerator } from "@/lib/community/auth";

async function guard() {
  if (!(await isModerator())) throw new Error("Not allowed");
}

const table = (t: FormDataEntryValue | null) => (t === "answer" ? "answers" : "questions");

/** Approve: make visible and close its reports. */
export async function approve(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  const type = form.get("type") === "answer" ? "answer" : "question";
  const db = getDb();
  db.prepare(`UPDATE ${table(form.get("type"))} SET status = 'visible' WHERE id = ?`).run(id);
  db.prepare("UPDATE reports SET resolved = 1 WHERE target_type = ? AND target_id = ?").run(type, id);
  refresh();
}

export async function hide(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  const type = form.get("type") === "answer" ? "answer" : "question";
  const db = getDb();
  db.prepare(`UPDATE ${table(form.get("type"))} SET status = 'hidden' WHERE id = ?`).run(id);
  db.prepare("UPDATE reports SET resolved = 1 WHERE target_type = ? AND target_id = ?").run(type, id);
  refresh();
}

/** Block a user and hide all their posts (for scammers). */
export async function ban(form: FormData) {
  await guard();
  const userId = String(form.get("userId"));
  const db = getDb();
  db.prepare("UPDATE users SET banned = 1 WHERE id = ?").run(userId);
  db.prepare("UPDATE questions SET status = 'hidden' WHERE user_id = ?").run(userId);
  db.prepare("UPDATE answers SET status = 'hidden' WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  refresh();
}
