"use client";

import { useToday } from "@/lib/useToday";

const AUTO_CHECK_VALID_DAYS = 7;

/**
 * Shows a warning when a fact may be outdated: its last check by a person is older than its review window AND there
 * is no recent automatic check (within 7 days) that found its wording still on the official page. Uses the viewer's
 * current date.
 */
export function StaleBadge({ verifiedOn, reviewDays, autoCheckedOn }: { verifiedOn: string; reviewDays: number; autoCheckedOn?: string }) {
  const today = useToday();
  if (!today) return null;
  const ageDays = (iso: string) => (today.getTime() - new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).getTime()) / 86_400_000;
  if (ageDays(verifiedOn) <= reviewDays) return null;
  if (autoCheckedOn && ageDays(autoCheckedOn) <= AUTO_CHECK_VALID_DAYS) return null;
  return <span className="rounded bg-warn-soft px-1.5 py-0.5 font-medium text-warn">may be outdated — please confirm with the source</span>;
}
