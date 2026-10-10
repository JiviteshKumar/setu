"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { analyzeLetter, type Analysis, type Quote } from "@/lib/letters/analyze";
import { SAMPLE_LETTERS } from "@/lib/letters/samples";
import { STATIC_SITE } from "@/lib/deploy";
import { Stamp, EASE_OUT } from "@/components/motion";

type OcrState = { status: "idle" } | { status: "loading"; progress: number; label: string } | { status: "error"; message: string };

const MONTHS: Record<string, number> = { januar: 1, februar: 2, märz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };

function parseGermanDate(s: string): Date | null {
  const m = s.match(/(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})/);
  if (m) return new Date(Number(m[3].length === 2 ? `20${m[3]}` : m[3]), Number(m[2]) - 1, Number(m[1]));
  const n = s.match(/(\d{1,2})\.\s?([a-zä]+)\s+(\d{4})/i);
  if (n && MONTHS[n[2].toLowerCase()]) return new Date(Number(n[3]), MONTHS[n[2].toLowerCase()] - 1, Number(n[1]));
  return null;
}

function downloadIcs(items: { date: Date; title: string; detail: string }[]) {
  const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Setu//Letters//EN"];
  items.forEach((it, i) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:setu-letter-${ymd(it.date)}-${i}@setu`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
      `DTSTART;VALUE=DATE:${ymd(it.date)}`,
      `SUMMARY:${esc(it.title)}`,
      `DESCRIPTION:${esc(it.detail)}`,
      "BEGIN:VALARM",
      "TRIGGER:-P3D",
      "ACTION:DISPLAY",
      "DESCRIPTION:In 3 days",
      "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "letter-dates.ics";
  a.click();
  URL.revokeObjectURL(url);
}

function Highlight({ q }: { q: Quote }) {
  const i = q.sentence.indexOf(q.text);
  if (i < 0) return <>{q.sentence}</>;
  return (
    <>
      {q.sentence.slice(0, i)}
      <mark className="rounded bg-gold-soft px-0.5 text-text">{q.text}</mark>
      {q.sentence.slice(i + q.text.length)}
    </>
  );
}

export function LetterExplainer({ factCards }: { factCards: Record<string, React.ReactNode> }) {
  const [text, setText] = useState("");
  const [ocr, setOcr] = useState<OcrState>({ status: "idle" });
  const [result, setResult] = useState<Analysis | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [ai, setAi] = useState<{ status: "idle" | "loading" | "done" | "error"; data?: { summary: string; steps: { action: string; quote: string }[]; rejected: string[]; model: string }; error?: string }>({ status: "idle" });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (STATIC_SITE) return; // the AI explanation needs Setu's own server (local model); the static site has none
    fetch("/api/letter-ai")
      .then((r) => r.json())
      .then((d) => setAiEnabled(!!d.enabled))
      .catch(() => {});
  }, []);

  async function runOcr(file: File) {
    setResult(null);
    setOcr({ status: "loading", progress: 0, label: "Loading the German text-recognition model…" });
    try {
      // Loaded only when needed. Recognition runs in this browser; the photo is never uploaded.
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("deu", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") setOcr({ status: "loading", progress: m.progress, label: "Reading the letter…" });
          else setOcr({ status: "loading", progress: m.progress * 0.3, label: "Loading the German text-recognition model…" });
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setText(data.text);
      setOcr({ status: "idle" });
    } catch (e) {
      setOcr({ status: "error", message: (e as Error).message });
    }
  }

  function analyse(t = text) {
    setAi({ status: "idle" });
    setResult(analyzeLetter(t));
    setTimeout(() => document.getElementById("letter-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function explainWithAi() {
    setAi({ status: "loading" });
    try {
      const res = await fetch("/api/letter-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAi({ status: "done", data });
    } catch (e) {
      setAi({ status: "error", error: (e as Error).message });
    }
  }

  const dated = result
    ? [
        ...result.deadlines.map((d) => ({ kind: "Deadline" as const, q: d, date: parseGermanDate(d.text) })),
        ...result.appointments.map((d) => ({ kind: "Appointment" as const, q: d, date: parseGermanDate(d.text) })),
      ]
    : [];

  return (
    <div className="space-y-5">
      <section className="card space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="btn-primary cursor-pointer">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) runOcr(f);
                e.target.value = "";
              }}
            />
            Take or upload a photo
          </label>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            Try an example:
            {SAMPLE_LETTERS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip hover:text-text"
                onClick={() => {
                  setText(s.text);
                  analyse(s.text);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">
          Private by design: text recognition runs inside your browser and nothing you photograph or paste is uploaded. Only the recognition model (about
          2–10 MB) is downloaded once.
        </p>

        <AnimatePresence>
          {ocr.status === "loading" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="text-sm">{ocr.label}</p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                <motion.div className="h-full rounded-full bg-accent-bright" animate={{ width: `${Math.round(ocr.progress * 100)}%` }} transition={{ ease: "linear" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {ocr.status === "error" && <p className="text-sm text-danger">Couldn&apos;t read the photo ({ocr.message}). Try a sharper, well-lit photo, or paste the text.</p>}

        <label className="block">
          <span className="label">Letter text (check it — photo recognition can make mistakes)</span>
          <textarea
            className="input min-h-44 font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the letter here, or take a photo above…"
          />
        </label>
        <button type="button" className="btn-primary" disabled={text.trim().length < 30} onClick={() => analyse()}>
          Explain this letter
        </button>
      </section>

      {result && (
        <motion.div id="letter-result" key={text.length} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }} className="space-y-4 scroll-mt-20">
          {result.warnings.length > 0 && (
            <section className="card relative border-danger/40 bg-danger-soft">
              <div className="absolute top-4 right-4">
                <Stamp tone="danger" rotate={-8}>
                  Caution
                </Stamp>
              </div>
              <h2 className="h2 pr-28 text-danger">Warning signs</h2>
              <ul className="mt-2 space-y-2 text-[15px]">
                {result.warnings.map((w, i) => (
                  <li key={i}>
                    {w.label}
                    {w.sentence && <span className="mt-1 block rounded-lg bg-surface/70 p-2 font-mono text-xs">„{w.sentence}“</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <p className="eyebrow">What is this letter?</p>
            {result.types.length ? (
              result.types.map((t) => (
                <div key={t.id} className="mt-2">
                  <p className="text-lg font-semibold">
                    {t.label} <span className="chip ml-1 align-middle">{t.confidence}</span>
                  </p>
                  <p className="mt-1 text-[15px] text-muted">{t.what}</p>
                </div>
              ))
            ) : (
              <p className="mt-2 text-muted">We couldn&apos;t tell who sent it. Look at the letterhead at the top.</p>
            )}
            {!result.types.length &&
              !dated.length &&
              !result.relativeDeadlines.length &&
              !result.actions.length &&
              !result.amounts.length &&
              !result.references.length && (
                <p className="mt-3 rounded-lg bg-warn-soft p-3 text-sm text-warn">
                  We found no dates, amounts, reference numbers or requests in this text. This tool explains German official letters — if this is
                  one, check that the whole letter was copied and that the photo text was read correctly (compare it with the paper).
                </p>
              )}
          </section>

          {(dated.length > 0 || result.relativeDeadlines.length > 0) && (
            <section className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="h2">Dates and deadlines</h2>
                {dated.some((d) => d.date) && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => downloadIcs(dated.filter((d) => d.date).map((d) => ({ date: d.date!, title: `${d.kind} (letter)`, detail: d.q.sentence })))}
                  >
                    Add to calendar
                  </button>
                )}
              </div>
              <ul className="mt-3 space-y-2">
                {dated.map((d, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className={`rounded-xl border-l-4 bg-surface-2 p-3 ${d.kind === "Deadline" ? "border-danger" : "border-accent-bright"}`}>
                    <p className="text-xs font-semibold tracking-wide uppercase">
                      {d.kind}: {d.q.text}
                    </p>
                    <p className="mt-1 text-sm">
                      „<Highlight q={d.q} />“
                    </p>
                  </motion.li>
                ))}
                {result.relativeDeadlines.map((d, i) => (
                  <li key={`r${i}`} className="rounded-xl border-l-4 border-warn bg-surface-2 p-3">
                    <p className="text-xs font-semibold tracking-wide uppercase">Time limit: {d.text}</p>
                    <p className="mt-1 text-sm">
                      „<Highlight q={d} />“
                    </p>
                    <p className="mt-1 text-xs text-muted">Usually counted from the day you received the letter — keep the envelope.</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.actions.length > 0 && (
            <section className="card">
              <h2 className="h2">What the letter asks you to do</h2>
              <ul className="mt-3 space-y-2">
                {result.actions.map((a) => (
                  <li key={a.id} className="rounded-xl bg-surface-2 p-3">
                    <p className="font-medium">{a.label}</p>
                    <p className="mt-1 font-mono text-xs text-muted">„{a.sentence}“</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(result.amounts.length > 0 || result.references.length > 0) && (
            <section className="grid gap-4 sm:grid-cols-2">
              {result.amounts.length > 0 && (
                <div className="card">
                  <h2 className="h2">Amounts</h2>
                  <ul className="mt-2 space-y-2 text-sm">
                    {result.amounts.map((a, i) => (
                      <li key={i}>
                        <strong className="text-base">{a.text}</strong>
                        <span className="block text-xs text-muted">„{a.sentence}“</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.references.length > 0 && (
                <div className="card">
                  <h2 className="h2">Reference numbers</h2>
                  <p className="text-xs text-muted">Quote these in every reply and bank transfer.</p>
                  <ul className="mt-2 space-y-2">
                    {result.references.map((r) => (
                      <li key={r.value} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
                        <span className="min-w-0">
                          <span className="block text-xs text-muted">{r.label}</span>
                          <span className="font-mono">{r.value}</span>
                        </span>
                        <button
                          type="button"
                          className="text-xs text-accent underline"
                          onClick={() => {
                            navigator.clipboard?.writeText(r.value).catch(() => {});
                            setCopied(r.value);
                          }}
                        >
                          {copied === r.value ? "Copied" : "Copy"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {result.hasObjectionInfo && factCards["objection-deadline"]}
          {result.types.some((t) => t.id === "rundfunk") && factCards["rundfunk-fee"]}

          {result.terms.length > 0 && (
            <section className="card">
              <h2 className="h2">Words in this letter</h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {result.terms.map((t, i) => (
                  <motion.div key={t.de} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="rounded-xl bg-surface-2 p-3">
                    <dt className="font-mono text-sm font-semibold">{t.de}</dt>
                    <dd className="text-sm">{t.en}</dd>
                    {t.note && <dd className="mt-1 text-xs text-muted">{t.note}</dd>}
                  </motion.div>
                ))}
              </dl>
            </section>
          )}

          {aiEnabled && (
            <section className="card space-y-3">
              <h2 className="h2">Plain-English explanation (AI)</h2>
              <p className="text-xs text-muted">
                Optional. The letter text is sent to Setu&apos;s own server, where a local AI model explains it. It is not stored. Every step must quote the letter, and
                anything that mentions a number or date not in the letter is removed automatically.
              </p>
              {ai.status !== "done" && (
                <button type="button" className="btn-ghost" onClick={explainWithAi} disabled={ai.status === "loading"}>
                  {ai.status === "loading" ? "Explaining… (can take a minute)" : "Explain with AI"}
                </button>
              )}
              {ai.status === "error" && <p className="text-sm text-danger">{ai.error}</p>}
              {ai.status === "done" && ai.data && (
                <div className="space-y-2">
                  {ai.data.summary && <p className="text-[15px]">{ai.data.summary}</p>}
                  <ul className="space-y-2">
                    {ai.data.steps.map((s, i) => (
                      <li key={i} className="rounded-xl bg-surface-2 p-3 text-sm">
                        <p className="font-medium">{s.action}</p>
                        <p className="mt-1 font-mono text-xs text-muted">„{s.quote}“</p>
                      </li>
                    ))}
                  </ul>
                  {ai.data.rejected.length > 0 && <p className="text-xs text-warn">Removed {ai.data.rejected.length} AI statement(s) that could not be matched to the letter.</p>}
                  <p className="text-xs text-muted">AI model: {ai.data.model}. Always check against the letter itself.</p>
                </div>
              )}
            </section>
          )}

          <p className="text-xs text-muted">
            This tool helps you understand a letter; it is not legal advice. For important letters (residence permit, court, large amounts), ask your
            university&apos;s international office or student advice service — and never miss the deadline while you wait.
          </p>
        </motion.div>
      )}
    </div>
  );
}
