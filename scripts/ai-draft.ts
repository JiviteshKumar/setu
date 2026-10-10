// Drafts a plain-English alert from a change on an official page, using a LOCAL model via Ollama (free, offline).
// The model only ever sees the changed official text. Its draft is then checked by `guardDraft`:
// every number and date it mentions must appear in that text, otherwise the draft is rejected.
// A person always reviews before anything is published.

import { unsupportedTokens } from "../src/lib/guard.ts";

export const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:4b";

export type Draft = {
  relevant: boolean;
  title: string;
  summary: string;
  audience: ("planning" | "in-germany")[];
  severity: "info" | "important" | "urgent";
};

export type GuardResult = { ok: boolean; unsupported: string[] };

const SYSTEM = `You help Indian students who plan a Master's in Germany or already live there.
You receive text that was ADDED to or REMOVED from an official German government or university web page.
Rules:
- Use ONLY the given text. Never add facts, numbers, dates, fees or advice that are not in it.
- If the change is navigation, layout, cookie or date-stamp noise, or does not affect students, set "relevant" to false.
- Write simple English. Title: max 12 words. Summary: max 60 words, say what changed and who is affected.
- Answer with JSON only: {"relevant": boolean, "title": string, "summary": string, "audience": ["planning"|"in-germany"], "severity": "info"|"important"|"urgent"}`;

export async function ollamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const json = (await res.json()) as { models?: { name: string }[] };
    return !!json.models?.some((m) => m.name === OLLAMA_MODEL);
  } catch {
    return false;
  }
}

export async function draftAlert(input: { sourceName: string; added: string[]; removed: string[] }): Promise<Draft | null> {
  const user = [
    `Official page: ${input.sourceName}`,
    "ADDED TEXT:",
    ...input.added.slice(0, 40).map((l) => `+ ${l}`),
    "REMOVED TEXT:",
    ...input.removed.slice(0, 40).map((l) => `- ${l}`),
  ].join("\n");
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      think: false,
      format: "json",
      options: { temperature: 0 }, // deterministic: no creativity wanted
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const json = (await res.json()) as { message?: { content?: string } };
  try {
    const d = JSON.parse(json.message?.content ?? "") as Partial<Draft>;
    if (typeof d.title !== "string" || typeof d.summary !== "string") return null;
    return {
      relevant: d.relevant !== false,
      title: d.title.trim(),
      summary: d.summary.trim(),
      audience: (Array.isArray(d.audience) ? d.audience : []).filter((a): a is Draft["audience"][number] => a === "planning" || a === "in-germany"),
      severity: d.severity === "urgent" || d.severity === "important" ? d.severity : "info",
    };
  } catch {
    return null;
  }
}

/** Rejects a draft that mentions any number, date or month that does not occur in the official text it summarises. */
export function guardDraft(draft: Draft, officialText: string): GuardResult {
  const unsupported = unsupportedTokens(`${draft.title} ${draft.summary}`, officialText);
  if (/https?:\/\//.test(draft.summary)) unsupported.push("(link)");
  return { ok: unsupported.length === 0, unsupported };
}
