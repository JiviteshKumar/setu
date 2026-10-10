import { connection, type NextRequest } from "next/server";

// Official job board of the German Federal Employment Agency (Bundesagentur für Arbeit).
// Public client id documented at https://jobsuche.api.bund.dev/
const API = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs";
const CLIENT_ID = "jobboerse-jobsuche";

import type { Job } from "@/lib/jobs";

type BaJob = {
  referenznummer: string;
  stellenangebotsTitel?: string;
  hauptberuf?: string;
  firma?: string;
  stellenlokationen?: { adresse?: { ort?: string } }[];
  datumErsteVeroeffentlichung?: string;
  stellenangebotsart?: string;
  gehaltsspanneVon?: number;
  gehaltsspanneBis?: number;
  verguetungsangabe?: string;
};

const KIND: Record<string, string> = {
  ARBEIT: "Job",
  PRAKTIKUM_TRAINEE: "Internship / working student",
  AUSBILDUNG: "Apprenticeship",
  SELBSTAENDIGKEIT: "Self-employment",
};

export async function GET(req: NextRequest) {
  await connection();
  const q = req.nextUrl.searchParams;
  const type = q.get("type") ?? "werkstudent";
  const field = (q.get("field") ?? "").slice(0, 80);
  const city = (q.get("city") ?? "").slice(0, 60);
  const page = Math.max(1, Math.min(20, Number(q.get("page")) || 1));

  const params = new URLSearchParams({ size: "25", page: String(page), veroeffentlichtseit: "30" });
  // "Werkstudent" is the German term for working-student jobs; adding it to the search text is how the job board itself recommends finding them.
  const what = type === "werkstudent" ? `Werkstudent ${field}` : field;
  if (what.trim()) params.set("was", what.trim());
  if (city) {
    params.set("wo", city);
    params.set("umkreis", "25");
  }
  if (type === "minijob") params.set("arbeitszeit", "mj");
  if (type === "internship") params.set("angebotsart", "34");
  if (type === "fulltime") {
    params.set("angebotsart", "1");
    params.set("arbeitszeit", "vz");
  }

  try {
    const res = await fetch(`${API}?${params}`, { headers: { "X-API-Key": CLIENT_ID } });
    if (!res.ok) throw new Error(`Job board returned ${res.status}`);
    const data = await res.json();
    const jobs: Job[] = ((data.ergebnisliste ?? []) as BaJob[]).map((j) => ({
      id: j.referenznummer,
      title: j.stellenangebotsTitel ?? j.hauptberuf ?? "Job",
      company: j.firma ?? "",
      city: j.stellenlokationen?.[0]?.adresse?.ort ?? null,
      published: j.datumErsteVeroeffentlichung ?? null,
      kind: (j.stellenangebotsart && KIND[j.stellenangebotsart]) ?? j.stellenangebotsart ?? "",
      pay: j.gehaltsspanneVon ? `€${j.gehaltsspanneVon}${j.gehaltsspanneBis ? `–${j.gehaltsspanneBis}` : ""}${j.verguetungsangabe === "STUNDENLOHN" ? "/hour" : ""}` : null,
      url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(j.referenznummer)}`,
    }));
    return Response.json({ total: data.maxErgebnisse ?? jobs.length, page, jobs });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
