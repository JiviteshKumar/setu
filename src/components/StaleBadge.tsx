"use client";

import { useToday } from "@/lib/useToday";

/** Shows a warning when a fact hasn't been re-checked within its review window. Uses the viewer's current date. */
export function StaleBadge({ verifiedOn, reviewDays }: { verifiedOn: string; reviewDays: number }) {
  const today = useToday();
  if (!today) return null;
  const age = (today.getTime() - new Date(`${verifiedOn}T00:00:00Z`).getTime()) / 86_400_000;
  if (age <= reviewDays) return null;
  return <span className="rounded bg-warn-soft px-1.5 py-0.5 font-medium text-warn">may be outdated — please confirm with the source</span>;
}
