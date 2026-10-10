const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "07-15" -> "15 Jul" */
export function formatMonthDay(md: string): string {
  const [m, d] = md.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Next calendar occurrence of a recurring "MM-DD" deadline, on or after `from`. */
export function nextOccurrence(md: string, from: Date): Date {
  const [m, d] = md.split("-").map(Number);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const candidate = new Date(today.getFullYear(), m - 1, d);
  if (candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
  return candidate;
}

export function daysUntil(date: Date, from: Date): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
