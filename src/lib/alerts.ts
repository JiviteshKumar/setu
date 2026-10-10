import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Alert = {
  id: string;
  publishedAt: string;
  title: string;
  summary: string;
  severity: "info" | "important" | "urgent";
  audience: ("planning" | "in-germany")[];
  sources: { name: string; url: string }[];
  /** "official-change": a reviewed change on an official page; "correction": a fix after a user report. */
  kind: "official-change" | "correction";
};

export const ALERTS_FILE = join(process.cwd(), "data", "alerts.json");

/** Published (human-approved) alerts, newest first. Read at build/start time — approve + redeploy to publish. */
export function getAlerts(): Alert[] {
  if (!existsSync(ALERTS_FILE)) return [];
  const { alerts } = JSON.parse(readFileSync(ALERTS_FILE, "utf-8")) as { alerts: Alert[] };
  return [...alerts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
