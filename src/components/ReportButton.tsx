"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { EASE_OUT } from "./motion";
import { REPO_URL, STATIC_SITE } from "@/lib/deploy";

/** Small "Report a mistake" link that opens an inline form. Reports go to the human review queue. */
export function ReportButton({ context }: { context?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (STATIC_SITE) {
      // Static site (no server to store reports): open a pre-filled public issue on the project's GitHub page.
      const f = Object.fromEntries(form) as Record<string, string>;
      const body = [
        `**Page:** ${pathname}${context ? ` (${context})` : ""}`,
        `**What is wrong:**\n${f.message}`,
        f.correction && `**What is correct:**\n${f.correction}`,
        f.sourceUrl && `**Official source:** ${f.sourceUrl}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      window.open(`${REPO_URL}/issues/new?${new URLSearchParams({ title: `Mistake on ${pathname}`, body, labels: "mistake-report" })}`, "_blank", "noopener,noreferrer");
      setState("sent");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form), page: pathname, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send");
      setState("sent");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }

  if (STATIC_SITE && !REPO_URL) return null; // nowhere to send reports

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-muted underline decoration-dotted hover:text-text" aria-expanded={open}>
        Report a mistake
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="overflow-hidden">
            {state === "sent" ? (
              <p className="mt-2 rounded-xl bg-ok-soft p-3 text-sm text-ok">
                {STATIC_SITE
                  ? "Thank you. Submit the report on the GitHub page that just opened — a person will check it against the official source."
                  : "Thank you. A person will check this against the official source."}
              </p>
            ) : (
              <form onSubmit={submit} className="mt-2 grid gap-2 rounded-xl border border-border bg-surface-2 p-3 text-sm">
                <textarea name="message" required minLength={10} maxLength={1000} className="input min-h-20 text-sm" placeholder="What is wrong?" />
                <input name="correction" maxLength={1000} className="input text-sm" placeholder="What is correct? (optional)" />
                <input name="sourceUrl" type="url" maxLength={500} className="input text-sm" placeholder="Official source link (optional)" />
                {/* Honeypot: hidden from people, filled by bots */}
                <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <p className="text-xs text-muted">
                  Please don&apos;t include personal details. We only need the official source.
                  {STATIC_SITE && " Reports are filed as public issues on GitHub (free account needed)."}
                </p>
                {state === "error" && <p className="text-xs text-danger">{error}</p>}
                <button className="btn-primary justify-self-start" disabled={state === "sending"}>
                  {state === "sending" ? "Sending…" : STATIC_SITE ? "Continue on GitHub" : "Send report"}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
