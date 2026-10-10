// Explicit prop types (not PageProps<…>): this route is left out of the static build, where its route type doesn't exist.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getDb } from "@/lib/community/db";
import { currentUser } from "@/lib/community/auth";
import { getProgrammes } from "@/lib/programmes";
import { PageHeader } from "@/components/PageHeader";
import { AskForm, SignInForm } from "./Forms";
import { deleteAccount, signOut } from "./actions";

export const metadata: Metadata = { title: "Ask verified seniors" };

export default function AskPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="space-y-6">
      <Link href="/connect" className="text-sm text-muted hover:text-text">
        ← Senior connect
      </Link>
      <PageHeader eyebrow="Community" title={<>Ask verified seniors</>}>
        Questions from students in India, answered by students who study at German public universities. Only people signed in with a university email can
        answer — they carry a verified badge with their university&apos;s name.
      </PageHeader>
      <Suspense fallback={<div className="card h-32 animate-pulse" />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Row = { id: number; title: string; uni_name: string | null; created_at: string; status: string; author: string; answers: number; verified_answers: number; mine: number };

async function Board({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const sp = await searchParams;
  const user = await currentUser();
  const uniFilter = typeof sp.uni === "string" ? sp.uni : "";
  const rows = getDb()
    .prepare(
      `SELECT q.id, q.title, q.uni_name, q.created_at, q.status, u.display_name AS author,
        (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id AND a.status = 'visible') AS answers,
        (SELECT COUNT(*) FROM answers a JOIN users au ON au.id = a.user_id WHERE a.question_id = q.id AND a.status = 'visible' AND au.verified_uni_id IS NOT NULL) AS verified_answers,
        (q.user_id = ?) AS mine
       FROM questions q JOIN users u ON u.id = q.user_id
       WHERE (q.status = 'visible' OR q.user_id = ?) AND (? = '' OR q.uni_id = ?)
       ORDER BY q.created_at DESC LIMIT 100`,
    )
    .all(user?.id ?? "", user?.id ?? "", uniFilter, uniFilter) as Row[];

  const unis = [...new Map(getProgrammes().map((p) => [p.universityId, { id: p.universityId, name: p.university }])).values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      {sp.signin === "ok" && <p className="rounded-xl bg-ok-soft p-3 text-sm text-ok">You&apos;re signed in.</p>}
      {sp.signin === "expired" && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">That sign-in link has expired or was already used. Please request a new one.</p>}
      {sp.deleted && <p className="rounded-xl bg-ok-soft p-3 text-sm text-ok">Your account and all your posts were deleted.</p>}

      {user ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            Signed in as <strong>{user.display_name}</strong>{" "}
            {user.verified_uni_name ? <span className="chip border-ok/40 bg-ok-soft text-ok">✓ Verified · {user.verified_uni_name}</span> : <span className="chip">Not a university email — you can ask, not answer</span>}
          </span>
          <span className="flex gap-2">
            <form action={signOut}>
              <button className="btn-ghost py-1.5">Sign out</button>
            </form>
            <details className="relative">
              <summary className="btn-ghost cursor-pointer list-none py-1.5 text-danger">Delete my account…</summary>
              <form action={deleteAccount} className="absolute right-0 z-10 mt-2 w-64 space-y-2 rounded-xl border border-border bg-surface p-3 shadow-card">
                <p className="text-xs">This permanently deletes your account, your questions and your answers. It cannot be undone.</p>
                <button className="btn-primary w-full bg-danger py-1.5">Yes, delete everything</button>
              </form>
            </details>
          </span>
        </div>
      ) : (
        <SignInForm />
      )}

      {user && !user.banned && <AskForm unis={unis} />}

      <section>
        <form className="mb-3 flex gap-2" action="/connect/ask">
          <select name="uni" defaultValue={uniFilter} className="input py-2" aria-label="Filter questions by university">
            <option value="">All universities</option>
            {unis.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button className="btn-ghost">Filter</button>
        </form>
        {rows.length === 0 ? (
          <p className="card text-muted">No questions yet{uniFilter ? " for this university" : ""}. Be the first to ask.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((q) => (
              <li key={q.id}>
                <Link href={`/connect/ask/${q.id}`} className="card-link block">
                  <p className="font-semibold">{q.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {q.uni_name ?? "Any university"} · asked by {q.author} · {q.created_at.slice(0, 10)} · {q.answers} answer{q.answers === 1 ? "" : "s"}
                    {q.verified_answers ? ` (${q.verified_answers} verified)` : ""}
                  </p>
                  {q.status === "held" && q.mine ? <p className="mt-1 text-xs text-warn">Waiting for a moderator — only you can see this.</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
