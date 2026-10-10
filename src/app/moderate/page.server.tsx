import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/lib/community/db";
import { isModerator } from "@/lib/community/auth";
import { approve, ban, hide } from "./actions";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

export default function ModeratePage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Queue />
    </Suspense>
  );
}

type Item = { type: "question" | "answer"; id: number; title: string | null; body: string; status: string; flags: string; user_id: string; author: string; verified_uni_name: string | null; reports: number; reasons: string | null; created_at: string };

async function Queue() {
  await connection();
  if (!(await isModerator())) notFound();
  const db = getDb();
  const sql = (type: "question" | "answer", t: string, titleCol: string) => `
    SELECT '${type}' AS type, p.id, ${titleCol} AS title, p.body, p.status, p.flags, p.user_id, p.created_at, u.display_name AS author, u.verified_uni_name,
      (SELECT COUNT(*) FROM reports r WHERE r.target_type = '${type}' AND r.target_id = p.id AND r.resolved = 0) AS reports,
      (SELECT GROUP_CONCAT(reason, '; ') FROM reports r WHERE r.target_type = '${type}' AND r.target_id = p.id AND r.resolved = 0) AS reasons
    FROM ${t} p JOIN users u ON u.id = p.user_id
    WHERE p.status = 'held' OR EXISTS (SELECT 1 FROM reports r WHERE r.target_type = '${type}' AND r.target_id = p.id AND r.resolved = 0)`;
  const items = [...(db.prepare(sql("question", "questions", "p.title")).all() as Item[]), ...(db.prepare(sql("answer", "answers", "NULL")).all() as Item[])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const stats = db.prepare("SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM questions) AS questions, (SELECT COUNT(*) FROM answers) AS answers").get() as {
    users: number;
    questions: number;
    answers: number;
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Moderators only</p>
        <h1 className="h1">Community moderation</h1>
        <p className="mt-2 text-sm text-muted">
          {stats.users} users · {stats.questions} questions · {stats.answers} answers. Held posts are invisible to others until you approve them. Ban accounts
          that sell admissions, visas or flats, or ask for money.
        </p>
      </div>
      {items.length === 0 && <p className="card text-muted">Nothing to review.</p>}
      {items.map((p) => (
        <article key={`${p.type}-${p.id}`} className="card space-y-2 text-sm">
          <p className="text-xs text-muted">
            {p.type} #{p.id} · {p.author}
            {p.verified_uni_name ? ` (verified · ${p.verified_uni_name})` : ""} · {p.created_at.slice(0, 16).replace("T", " ")} · status {p.status}
          </p>
          {p.title && <p className="font-semibold">{p.title}</p>}
          <p className="prose-text">{p.body}</p>
          {p.flags && <p className="rounded-lg bg-warn-soft p-2 text-xs text-warn">Automatic flags: {p.flags}</p>}
          {p.reports > 0 && (
            <p className="rounded-lg bg-danger-soft p-2 text-xs text-danger">
              {p.reports} report(s): {p.reasons}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Approve", fn: approve, cls: "btn-primary" },
              { label: "Hide", fn: hide, cls: "btn-ghost" },
            ].map((b) => (
              <form key={b.label} action={b.fn}>
                <input type="hidden" name="type" value={p.type} />
                <input type="hidden" name="id" value={p.id} />
                <button className={`${b.cls} py-1.5`}>{b.label}</button>
              </form>
            ))}
            <form action={ban}>
              <input type="hidden" name="userId" value={p.user_id} />
              <button className="btn-ghost py-1.5 text-danger">Ban user &amp; hide all posts</button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
