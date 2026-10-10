// Explicit prop types (not PageProps<…>): this route is left out of the static build, where its route type doesn't exist.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/lib/community/db";
import { currentUser } from "@/lib/community/auth";
import { AnswerForm, ReportForm } from "../Forms";

export const metadata: Metadata = { title: "Question" };

export default function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-5">
      <Link href="/connect/ask" className="text-sm text-muted hover:text-text">
        ← All questions
      </Link>
      <Suspense fallback={<div className="card h-40 animate-pulse" />}>
        <Thread params={params} />
      </Suspense>
    </div>
  );
}

type Q = { id: number; title: string; body: string; uni_name: string | null; created_at: string; status: string; user_id: string; author: string };
type A = { id: number; body: string; created_at: string; status: string; user_id: string; author: string; verified_uni_name: string | null };

async function Thread({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = Number((await params).id);
  const user = await currentUser();
  const db = getDb();
  const q = db.prepare("SELECT q.*, u.display_name AS author FROM questions q JOIN users u ON u.id = q.user_id WHERE q.id = ?").get(id) as Q | undefined;
  if (!q || (q.status !== "visible" && q.user_id !== user?.id)) notFound();
  const answers = db
    .prepare(
      `SELECT a.id, a.body, a.created_at, a.status, a.user_id, u.display_name AS author, u.verified_uni_name
       FROM answers a JOIN users u ON u.id = a.user_id
       WHERE a.question_id = ? AND (a.status = 'visible' OR a.user_id = ?)
       ORDER BY (u.verified_uni_id IS NOT NULL) DESC, a.created_at ASC`,
    )
    .all(id, user?.id ?? "") as A[];

  return (
    <>
      <article className="card space-y-2">
        <p className="eyebrow">{q.uni_name ?? "Any university"}</p>
        <h1 className="font-display text-3xl leading-tight">{q.title}</h1>
        <p className="prose-text">{q.body}</p>
        <p className="text-xs text-muted">
          Asked by {q.author} · {q.created_at.slice(0, 10)}
        </p>
        {q.status === "held" && <p className="text-xs text-warn">Waiting for a moderator — only you can see this.</p>}
        {user && user.id !== q.user_id && <ReportForm type="question" id={q.id} />}
      </article>

      <section className="space-y-3">
        <h2 className="h2">
          {answers.length} answer{answers.length === 1 ? "" : "s"}
        </h2>
        {answers.map((a) => (
          <article key={a.id} className={`card space-y-2 ${a.verified_uni_name ? "border-ok/40" : ""}`}>
            <p className="text-sm">
              <strong>{a.author}</strong>{" "}
              {a.verified_uni_name ? <span className="chip border-ok/40 bg-ok-soft text-ok">✓ Verified · {a.verified_uni_name}</span> : null}
            </p>
            <p className="prose-text">{a.body}</p>
            <p className="text-xs text-muted">{a.created_at.slice(0, 10)}</p>
            {a.status === "held" && <p className="text-xs text-warn">Waiting for a moderator — only you can see this.</p>}
            {user && user.id !== a.user_id && <ReportForm type="answer" id={a.id} />}
          </article>
        ))}
        <p className="text-xs text-muted">
          Answers share personal experience. For rules and deadlines, always check the official source — and never pay anyone you met here.
        </p>
      </section>

      {!user ? (
        <p className="card text-sm">
          <Link href="/connect/ask" className="text-accent underline">
            Sign in
          </Link>{" "}
          with your university email to answer.
        </p>
      ) : user.verified_uni_id && !user.banned && q.status === "visible" ? (
        <AnswerForm questionId={q.id} />
      ) : (
        <p className="card text-sm text-muted">Only students signed in with a German public-university email can answer.</p>
      )}
    </>
  );
}
