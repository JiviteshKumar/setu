// Jobs from the official board of the German Federal Employment Agency (Bundesagentur für Arbeit).
// The server build searches it live through /api/jobs. The board's API doesn't allow requests from other websites
// (no CORS), so the static site opens the same search on the official board instead.

export type Job = {
  id: string;
  title: string;
  company: string;
  city: string | null;
  published: string | null;
  kind: string;
  pay: string | null;
  url: string;
};

export type JobQuery = { type: string; field: string; city: string };

/** The same search on www.arbeitsagentur.de/jobsuche (same words as the API search in src/app/api/jobs/route.ts). */
export function officialSearchUrl({ type, field, city }: JobQuery): string {
  const p = new URLSearchParams();
  const what = (type === "werkstudent" ? `Werkstudent ${field}` : field).trim();
  if (what) p.set("was", what);
  if (city.trim()) {
    p.set("wo", city.trim());
    p.set("umkreis", "25");
  }
  if (type === "minijob") p.set("arbeitszeit", "mj");
  if (type === "internship") p.set("angebotsart", "34");
  if (type === "fulltime") {
    p.set("angebotsart", "1");
    p.set("arbeitszeit", "vz");
  }
  return `https://www.arbeitsagentur.de/jobsuche/suche?${p}`;
}
