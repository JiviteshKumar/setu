import type { Metadata } from "next";
import Link from "next/link";
import { STATIC_SITE } from "@/lib/deploy";
import { getProgrammes, dataBuiltAt } from "@/lib/programmes";
import { PageHeader } from "@/components/PageHeader";
import { SourceNote } from "@/components/SourceNote";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { UniversitySupport, type UniSupport } from "./UniversitySupport";

export const metadata: Metadata = { title: "Connect with seniors" };

const SAFETY = [
  { t: "Never pay anyone for admission or a visa.", d: "Admission is decided by the university and visas by the German missions. 'Agents' in groups who promise either for money are scamming you." },
  { t: "Check that a 'senior' is real.", d: "A real student can tell you their programme, show their university email domain or a public profile, and won't push you to pay for anything." },
  { t: "Never share OTPs, passwords, passport scans or bank details in a group.", d: "Send documents only to official portals (APS, uni-assist, the university, the consulate portal)." },
  { t: "Flats: never pay before you have verified the flat and signed a contract.", d: "Most housing scams start in student groups." },
  { t: "Group advice is not official information.", d: "Rules change. Check anything important against the official source — Setu shows the source for every rule." },
];

const QUESTIONS = [
  "How did you find your first room, and how long did it take?",
  "How difficult are the first-semester exams, and how many re-sits are allowed?",
  "Which courses are really taught in English?",
  "How easy is it to find a working-student job in this city without German?",
  "Which documents did the foreigners' office ask you for, and how long was the wait?",
  "Where do you buy Indian groceries, and what does food cost per month?",
  "What do you wish you had known before you came?",
];

export default function ConnectPage() {
  // One entry per public university: the union of support services listed on its DAAD programme pages.
  const byUni = new Map<string, UniSupport>();
  for (const p of getProgrammes()) {
    const u = byUni.get(p.universityId) ?? {
      id: p.universityId,
      name: p.university,
      city: p.city,
      state: p.state,
      website: p.universityWebsite,
      services: [],
      programmes: 0,
    };
    u.programmes++;
    u.services = [...new Set([...u.services, ...p.support])];
    byUni.set(p.universityId, u);
  }
  const unis = [...byUni.values()];
  const buddy = unis.filter((u) => u.services.includes("Buddy programme")).length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Senior connect" title={<>Talk to people who&apos;ve done it — safely</>}>
        The safest way to meet students who already study at your university is the university itself: {buddy} of {unis.length} public universities in Setu
        run an official buddy programme that matches you with a current student.
      </PageHeader>

      {!STATIC_SITE && (
      <Reveal>
        <Link href="/connect/ask" className="card-link flex flex-wrap items-center justify-between gap-3">
          <span>
            <span className="eyebrow block">Setu community</span>
            <span className="mt-1 block font-semibold">Ask verified seniors</span>
            <span className="block text-sm text-muted">
              Only students signed in with a German public-university email can answer. Contact details and payment requests are held for a moderator.
            </span>
          </span>
          <span className="text-sm font-medium text-accent">Open Q&amp;A →</span>
        </Link>
      </Reveal>
      )}

      <section>
        <h2 className="h2 mb-3">Official support at each university</h2>
        <UniversitySupport unis={unis} />
        <SourceNote sources={["daad"]} checkedOn={dataBuiltAt()} reviewDays={30} />
        <p className="mt-2 text-sm text-muted">
          After your admission, write to the university&apos;s international office and ask to join the buddy programme. Mention your programme and intake.
        </p>
      </section>

      <section>
        <h2 className="h2 mb-3">Joining WhatsApp or Telegram groups? Five rules</h2>
        <Stagger as="ol" className="space-y-2">
          {SAFETY.map((s, i) => (
            <StaggerItem as="li" key={s.t} className="card flex gap-3">
              <span className="font-display text-2xl text-accent-bright">{i + 1}</span>
              <span>
                <span className="block font-semibold">{s.t}</span>
                <span className="block text-sm text-muted">{s.d}</span>
              </span>
            </StaggerItem>
          ))}
        </Stagger>
        <p className="mt-2 text-sm text-muted">
          Found a flat in a group? Check it first with the{" "}
          <Link href="/germany/housing" className="text-accent underline">
            scam checker
          </Link>
          .
        </p>
      </section>

      <Reveal>
        <section className="card">
          <h2 className="h2">Questions worth asking a senior</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">
            {QUESTIONS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
