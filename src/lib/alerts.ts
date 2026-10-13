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
  /**
   * "official-change": a change on an official page, written up by a person; "correction": a fix after a user report;
   * "detected": found by the daily automatic check and published without a person — it only quotes the official page
   * word for word (`quotes`), never a summary written by software.
   */
  kind: "official-change" | "correction" | "detected";
  quotes?: { added: string[]; removed: string[] };
};

export const ALERTS_FILE = join(process.cwd(), "data", "alerts.json");

/** Published alerts, newest first. Read at build/start time; the daily cloud update (pages.yml) rebuilds the site. */
export function getAlerts(): Alert[] {
  if (!existsSync(ALERTS_FILE)) return [];
  const { alerts } = JSON.parse(readFileSync(ALERTS_FILE, "utf-8")) as { alerts: Alert[] };
  return [...alerts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
