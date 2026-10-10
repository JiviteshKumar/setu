import { connection } from "next/server";

// EUR→INR reference rate from the European Central Bank (official, free, no API key).
const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

let cache: { at: number; body: { rate: number; date: string; source: string } } | null = null;

export async function GET() {
  await connection(); // always run at request time
  if (cache && Date.now() - cache.at < 6 * 3600_000) return Response.json(cache.body);
  try {
    const xml = await (await fetch(ECB_URL)).text();
    const rate = Number(xml.match(/currency='INR' rate='([\d.]+)'/)?.[1]);
    const date = xml.match(/time='(\d{4}-\d{2}-\d{2})'/)?.[1];
    if (!rate || !date) throw new Error("INR rate not found in ECB feed");
    cache = { at: Date.now(), body: { rate, date, source: ECB_URL } };
    return Response.json(cache.body);
  } catch (err) {
    if (cache) return Response.json(cache.body);
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
