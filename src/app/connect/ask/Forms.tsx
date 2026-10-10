"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState } from "react";
import { answerQuestion, askQuestion, reportPost, requestSignIn, type FormState } from "./actions";

function Message({ state }: { state: FormState }) {
  return (
    <AnimatePresence>
      {(state.ok || state.error) && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg p-2.5 text-sm ${state.error ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok"}`}
          role="status"
        >
          {state.error ?? state.ok}
          {state.devLink && (
            <span className="mt-1 block text-xs text-text">
              Development mode (no email server configured):{" "}
              <a className="text-accent underline" href={state.devLink}>
                open the sign-in link
              </a>
            </span>
          )}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState(requestSignIn, {});
  return (
    <form action={action} className="card space-y-3">
      <h2 className="h2">Sign in with your email</h2>
      <p className="text-sm text-muted">
        No password — we email you a sign-in link. <strong className="text-text">Students at a German public university:</strong> use your university email to get the
        verified badge and answer questions. Your email is never shown to anyone.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="label">Email</span>
          <input className="input" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="block">
          <span className="label">Display name</span>
          <input className="input" name="name" required minLength={2} maxLength={40} placeholder="e.g. Priya (MSc, Aachen)" />
        </label>
      </div>
      <button className="btn-primary" disabled={pending}>
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function AskForm({ unis }: { unis: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(askQuestion, {});
  return (
    <form action={action} className="card space-y-3">
      <h2 className="h2">Ask the seniors</h2>
      <label className="block">
        <span className="label">University (optional)</span>
        <select name="uni" className="input py-2">
          <option value="">Any university</option>
          {unis.map((u) => (
            <option key={u.id} value={`${u.id}|${u.name}`}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Question</span>
        <input name="title" className="input" required minLength={10} maxLength={120} placeholder="e.g. How long did your residence permit appointment take in Aachen?" />
      </label>
      <label className="block">
        <span className="label">Details</span>
        <textarea name="body" className="input min-h-24" required minLength={20} maxLength={1500} />
      </label>
      <p className="text-xs text-muted">Don&apos;t share phone numbers, emails or payment details — posts that contain them wait for a moderator.</p>
      <button className="btn-primary" disabled={pending}>
        {pending ? "Posting…" : "Post question"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ReportForm({ type, id }: { type: "question" | "answer"; id: number }) {
  const [state, action, pending] = useActionState(reportPost, {});
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted underline decoration-dotted">Report</summary>
      {state.ok ? (
        <p className="mt-2 text-ok" role="status">
          {state.ok}
        </p>
      ) : (
        <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="id" value={id} />
          <select name="reason" className="rounded-lg border border-border bg-surface px-2 py-1">
            <option>Scam or asks for money</option>
            <option>Wrong or misleading information</option>
            <option>Harassment or hate</option>
            <option>Spam or advertising</option>
          </select>
          <button className="btn-ghost py-1" disabled={pending}>
            {pending ? "Sending…" : "Send report"}
          </button>
          {state.error && <span className="text-danger">{state.error}</span>}
        </form>
      )}
    </details>
  );
}

export function AnswerForm({ questionId }: { questionId: number }) {
  const [state, action, pending] = useActionState(answerQuestion, {});
  return (
    <form action={action} className="card space-y-3">
      <input type="hidden" name="questionId" value={questionId} />
      <label className="block">
        <span className="label">Your answer</span>
        <textarea name="body" className="input min-h-28" required minLength={20} maxLength={2000} placeholder="Share what you experienced. Link official sources where you can." />
      </label>
      <button className="btn-primary" disabled={pending}>
        {pending ? "Posting…" : "Post answer"}
      </button>
      <Message state={state} />
    </form>
  );
}
