import { connection, type NextRequest } from "next/server";
import { unsupportedTokens } from "@/lib/guard";
import { normaliseForMatch } from "@/lib/letters/analyze";

// Optional plain-English explanation of a letter by a LOCAL model (Ollama) on Setu's own server.
// Off unless SETU_LETTER_AI=1. The letter text is not stored or logged.
// Guards: every step must quote the letter word-for-word (otherwise dropped), and the summary may not contain any
// number or date that is not in the letter (otherwise rejected).
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:4b";
const enabled = () => process.env.SETU_LETTER_AI === "1";

const SYSTEM = `You explain German official letters to international students in simple English.
Use ONLY the letter text. Never add facts, laws, numbers, dates or advice that are not in the letter.
Answer with JSON only:
{"summary": "max 70 words: who sent it, what it is about, what they want",
 "steps": [{"action": "what the student should do, max 20 words", "quote": "the exact sentence from the letter this is based on, copied word for word in German"}]}
At most 5 steps.`;

export async function GET() {
  await connection();
  return Response.json({ enabled: enabled() });
}

export async function POST(req: NextRequest) {
  await connection();
  if (!enabled()) return Response.json({ error: "AI explanations are not enabled on this server." }, { status: 404 });
  let text = "";
  try {
    text = String((await req.json()).text ?? "").slice(0, 6000);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (text.trim().length < 40) return Response.json({ error: "The letter text is too short." }, { status: 400 });

  let parsed: { summary?: unknown; steps?: unknown };
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        think: false,
        format: "json",
        options: { temperature: 0 },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `LETTER:\n${text}` },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`model returned ${res.status}`);
    parsed = JSON.parse(((await res.json()) as { message?: { content?: string } }).message?.content ?? "{}");
  } catch (e) {
    return Response.json({ error: `The AI model is not available right now (${(e as Error).message}).` }, { status: 503 });
  }

  const letter = normaliseForMatch(text);
  const rejected: string[] = [];
  const steps = (Array.isArray(parsed.steps) ? parsed.steps : [])
    .filter((s): s is { action: string; quote: string } => typeof s?.action === "string" && typeof s?.quote === "string")
    .filter((s) => {
      const q = normaliseForMatch(s.quote);
      const ok = q.length >= 8 && letter.includes(q) && unsupportedTokens(s.action, text).length === 0;
      if (!ok) rejected.push(s.action);
      return ok;
    })
    .slice(0, 5);
  let summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const bad = unsupportedTokens(summary, text);
  if (bad.length) {
    rejected.push(`summary (mentions ${bad.join(", ")})`);
    summary = "";
  }
  return Response.json({ model: MODEL, summary, steps, rejected });
}
