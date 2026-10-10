"use server";

// Review actions. Only available while running locally (next dev) — never in a production build.
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { refresh } from "next/cache";
import { ALERTS_FILE, type Alert } from "@/lib/alerts";

const WATCH = join(process.cwd(), "data", "watch");

function assertDev() {
  if (process.env.NODE_ENV === "production") throw new Error("Review actions are only available in local development.");
}

function safeId(id: string) {
  if (!/^[\w.-]+$/.test(id)) throw new Error("Invalid id");
  return id;
}

function archive(dir: "pending" | "reports", id: string, status: "approved" | "dismissed") {
  const from = join(WATCH, dir, `${safeId(id)}.json`);
  const toDir = join(WATCH, "done");
  mkdirSync(toDir, { recursive: true });
  if (!existsSync(from)) return;
  const data = JSON.parse(readFileSync(from, "utf-8"));
  // Keep a record of every decision (audit trail), then remove it from the queue.
  writeFileSync(join(toDir, `${id}.json`), JSON.stringify({ ...data, status, reviewedAt: new Date().toISOString() }, null, 1));
  unlinkSync(from);
}

export async function approveAlert(formData: FormData) {
  assertDev();
  const id = safeId(String(formData.get("id")));
  const dir = formData.get("dir") === "reports" ? "reports" : "pending";
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  if (!title || !summary) throw new Error("Title and summary are required");
  const severity = (["info", "important", "urgent"] as const).find((s) => s === formData.get("severity")) ?? "info";
  const audience = (["planning", "in-germany"] as const).filter((a) => formData.getAll("audience").includes(a));
  const sourceName = String(formData.get("sourceName") ?? "");
  const sourceUrl = String(formData.get("sourceUrl") ?? "");
  if (!/^https:\/\//.test(sourceUrl)) throw new Error("An official https source link is required");

  const alert: Alert = {
    id,
    publishedAt: new Date().toISOString(),
    title,
    summary,
    severity,
    audience: audience.length ? audience : ["planning", "in-germany"],
    sources: [{ name: sourceName, url: sourceUrl }],
    kind: dir === "reports" ? "correction" : "official-change",
  };
  const existing: { alerts: Alert[] } = existsSync(ALERTS_FILE) ? JSON.parse(readFileSync(ALERTS_FILE, "utf-8")) : { alerts: [] };
  existing.alerts = [alert, ...existing.alerts.filter((a) => a.id !== id)];
  writeFileSync(ALERTS_FILE, JSON.stringify(existing, null, 1));
  archive(dir, id, "approved");
  refresh();
}

export async function dismiss(formData: FormData) {
  assertDev();
  const dir = formData.get("dir") === "reports" ? "reports" : "pending";
  archive(dir, safeId(String(formData.get("id"))), "dismissed");
  refresh();
}
