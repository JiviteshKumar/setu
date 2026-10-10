// Verified facts. Rules for editing this file:
// 1. Every fact needs an official source from sources.ts — never a blog, consultant or forum.
// 2. `verifiedOn` is the date a human re-read the source. Facts older than `reviewDays`
//    are shown with an "may be outdated" warning automatically.
// 3. If sources disagree, don't publish the fact — write it down in docs/open-questions.md.
// 4. `anchors` are short phrases (regex) that must appear on the source page for the fact to hold.
//    `npm run check:facts` re-downloads every source; if an anchor disappears, the page changed and a human must re-verify.
import type { SourceKey } from "./sources";

export type Fact = {
  id: string;
  topic: "dmat" | "aps" | "visa" | "money" | "scholarships" | "work" | "arrival" | "insurance" | "fees" | "studies" | "after-studies" | "german" | "letters";
  title: string;
  summary: string;
  details?: string[];
  sources: SourceKey[];
  verifiedOn: string; // YYYY-MM-DD
  reviewDays: number;
  anchors: { source: SourceKey; pattern: string }[];
};

export const FACTS: Fact[] = [
  {
    id: "dmat-who",
    topic: "dmat",
    title: "dMAT: who needs it",
    summary:
      "Master's applicants whose bachelor's degree is in Engineering, Commerce / Accounting / Finance / Economics, or Business / Management need a dMAT certificate for their APS certificate, for the Summer Semester 2027 intake or later.",
    details: [
      "Not needed for: Bachelor's applicants, PhD applicants, degrees outside these three field groups, and officially confirmed exchange, double-degree or university partnership programmes.",
      "Transition rule: not needed if you completed APS online registration before 29 June 2026, shipped complete APS documents before 29 June 2026, or already hold an APS certificate.",
      "B.Tech/B.E. Computer Science and Engineering is covered. Standalone Computer Science, BCA, IT, AI, Data Science and Cyber Security are not automatically covered (APS decides from your official degree title).",
      "Use our dMAT checker to look up your exact degree name in the official list.",
    ],
    sources: ["apsDmat", "apsDmatFields"],
    verifiedOn: "2026-10-09",
    reviewDays: 30,
    anchors: [{ source: "apsDmat", pattern: "29 June 2026" }, { source: "apsDmat", pattern: "Summer Semester 2027" }],
  },
  {
    id: "dmat-format",
    topic: "dmat",
    title: "What the dMAT tests",
    summary:
      "The dMAT has a Core Module (three subtests: Figure Sequences, Mathematical Equations, Latin Squares) and a Subject Module — for APS applicants the General Academic Module. Each takes 90 minutes, with a 30-minute break. It tests applying skills, not memorised facts.",
    details: [
      "No notes, notepaper, calculators, rulers, phones or smartwatches are allowed. Latecomers are not admitted.",
      "Practise for free with Setu's original questions — built on the official format.",
    ],
    sources: ["dmatSite", "dmatCandidates", "dmatPrepPdf"],
    verifiedOn: "2026-10-09",
    reviewDays: 30,
    anchors: [
      { source: "dmatSite", pattern: "three subtests" },
      { source: "dmatSite", pattern: "core module and a subject module" },
      { source: "dmatSite", pattern: "General Academic Module" },
    ],
  },
  {
    id: "dmat-score",
    topic: "dmat",
    title: "dMAT is not pass/fail for APS",
    summary:
      "APS India says the dMAT is not a stand-alone pass/fail test for the APS certificate, and a low score does not automatically lead to refusal. The result appears on the APS certificate and each university decides how to weigh it.",
    sources: ["apsDmat"],
    verifiedOn: "2026-10-09",
    reviewDays: 30,
    anchors: [{ source: "apsDmat", pattern: "pass/fail" }],
  },
  {
    id: "dmat-fee-dates",
    topic: "dmat",
    title: "dMAT fee and first test",
    summary:
      "The fee is €150, paid to g.a.s.t. during registration. The first test in India was on 26 September 2026 (registration closed 15 September); certificates are available from 12 October 2026. Watch the g.a.s.t. registration page for the next dates.",
    details: [
      "Test centres listed by APS India: Ahmedabad, Bengaluru, Bhopal, Chandigarh, Chennai, Kolkata, Mananthavady, Mumbai, New Delhi, Pune. Seats are first come, first served.",
      "You may submit your APS documents before your dMAT certificate is available; the APS certificate is issued only after the dMAT certificate is checked.",
    ],
    sources: ["apsDmat", "dmatRegister", "dmatSite"],
    verifiedOn: "2026-10-09",
    reviewDays: 14,
    anchors: [{ source: "apsDmat", pattern: "150" }, { source: "apsDmat", pattern: "26 September 2026" }, { source: "apsDmat", pattern: "12 October 2026" }],
  },
  {
    id: "blocked-account",
    topic: "money",
    title: "Blocked account amount",
    summary:
      "For a study visa, the German Missions in India ask for a blocked account with €11,904 for the first year of studies, of which at most €992 can be withdrawn per month.",
    details: [
      "The amount is linked to the German student grant (BAföG) rate and can change. Always check the German mission in India before transferring money.",
      "Provider fees are extra — deposit a little more than the minimum so fees don't leave you short.",
    ],
    sources: ["blockedAccount"],
    verifiedOn: "2026-10-09",
    reviewDays: 60,
    anchors: [{ source: "blockedAccount", pattern: "11[.,]904" }, { source: "blockedAccount", pattern: "992" }],
  },
  {
    id: "visa-portal-aps",
    topic: "visa",
    title: "Apply through the Consular Services Portal; APS almost always needed",
    summary:
      "The German Missions in India take study visa applications through the Consular Services Portal. You start with a questionnaire that decides your visa sub-type — changing the sub-type later means starting over. With Indian degrees you almost always need an APS certificate.",
    details: [
      "If your programme charges tuition (e.g. TUM, Baden-Württemberg), you must also show proof of the first year's fees — the blocked account cannot be used for tuition.",
    ],
    sources: ["indiaStudyVisa"],
    verifiedOn: "2026-10-09",
    reviewDays: 90,
    anchors: [{ source: "indiaStudyVisa", pattern: "Consular Service" }, { source: "indiaStudyVisa", pattern: "APS" }],
  },
  {
    id: "remonstration",
    topic: "visa",
    title: "No more remonstration after a visa refusal",
    summary:
      "Since 1 July 2025 German missions no longer accept a remonstration (informal appeal) against a visa refusal. Your options are a new application (with fee) or a lawsuit at the Administrative Court in Berlin (in German, with court costs).",
    details: ["So prepare your visa file carefully the first time. Missing or inconsistent documents cost you months."],
    sources: ["remonstration"],
    verifiedOn: "2026-10-09",
    reviewDays: 180,
    anchors: [{ source: "remonstration", pattern: "Remonstrationsverfahren" }, { source: "remonstration", pattern: "1\\. Juli 2025" }],
  },
  {
    id: "work-limit",
    topic: "work",
    title: "How much you may work as a student",
    summary:
      "Your student residence permit allows work of up to 140 full working days per year. Jobs as a student assistant at your university (studentische Nebentätigkeit) don't count towards this limit.",
    details: [
      "Part-time work is counted in whichever of two ways is better for you, decided separately for each calendar week:",
      "Method 1 (by day): a day with up to 4 hours of work counts as half a working day, a longer day as a full working day.",
      "Method 2 (by week): a calendar week counts as 2.5 working days — during the lecture period only if you work up to 20 hours that week; outside the lecture period regardless of how the hours are spread.",
      "Breaking the limit can put your residence permit at risk. Use our work-days tracker.",
    ],
    sources: ["aufenthg16b"],
    verifiedOn: "2026-10-09",
    reviewDays: 180,
    anchors: [{ source: "aufenthg16b", pattern: "140 Arbeitstage" }, { source: "aufenthg16b", pattern: "zweieinhalb Arbeitstage" }, { source: "aufenthg16b", pattern: "bis zu 20 Stunden" }, { source: "aufenthg16b", pattern: "bis zu vier Stunden" }],
  },
  {
    id: "job-search-after",
    topic: "after-studies",
    title: "18 months to find a job after graduating",
    summary:
      "After successfully completing your studies in Germany you can get a residence permit for up to 18 months to look for a job that matches your qualification.",
    details: ["You must be able to support yourself during this time."],
    sources: ["aufenthg20"],
    verifiedOn: "2026-10-09",
    reviewDays: 180,
    anchors: [{ source: "aufenthg20", pattern: "18 Monaten" }],
  },
  {
    id: "anmeldung",
    topic: "arrival",
    title: "Register your address within 2 weeks",
    summary:
      "Anyone who moves into a flat in Germany must register (Anmeldung) at the local registration office within two weeks of moving in. You need a landlord confirmation (Wohnungsgeberbestätigung).",
    details: [
      "Ask any landlord before paying: \"Ist Anmeldung möglich?\" (Can I register at this address?). If the answer is no, you can't get your tax ID, bank account and residence permit easily.",
      "Appointments in big cities are scarce — book as soon as you have your address.",
    ],
    sources: ["bmg17"],
    verifiedOn: "2026-10-09",
    reviewDays: 365,
    anchors: [{ source: "bmg17", pattern: "zwei Wochen" }],
  },
  {
    id: "student-insurance-30",
    topic: "insurance",
    title: "Student public health insurance: age limit 30",
    summary:
      "Compulsory statutory health insurance at the student rate applies at most until you complete your 30th year of life. If you start your Master's close to or after 30, ask a public insurer about your options before you choose.",
    sources: ["sgb5"],
    verifiedOn: "2026-10-09",
    reviewDays: 365,
    anchors: [{ source: "sgb5", pattern: "dreißigsten Lebensjahres" }],
  },
  {
    id: "bw-fees",
    topic: "fees",
    title: "Baden-Württemberg charges €1,500 per semester",
    summary:
      "Public universities in Baden-Württemberg (e.g. Stuttgart, Heidelberg, KIT, Freiburg, Mannheim) charge students from outside the EU/EEA €1,500 per semester, plus the normal semester contribution.",
    details: ["Exemptions exist (e.g. some exchange programmes, a talent quota of up to 5% per university)."],
    sources: ["bwFees"],
    verifiedOn: "2026-10-09",
    reviewDays: 180,
    anchors: [{ source: "bwFees", pattern: "1[.,]500" }],
  },
  {
    id: "tum-fees",
    topic: "fees",
    title: "TU Munich charges non-EU tuition",
    summary:
      "TUM charges students who completed their previous education outside the EU tuition fees — usually €4,000 or €6,000 per semester for Master's programmes. TUM has announced higher fees from winter semester 2027/28 (€4,600 or €6,800). Check each programme page.",
    details: ["Waivers exist for high-achieving and financially needy applicants."],
    sources: ["tumFees"],
    verifiedOn: "2026-10-09",
    reviewDays: 90,
    anchors: [{ source: "tumFees", pattern: "4[.,]000" }, { source: "tumFees", pattern: "6[.,]000" }, { source: "tumFees", pattern: "4[.,]600" }, { source: "tumFees", pattern: "6[.,]800" }],
  },
  {
    id: "aps-process",
    topic: "aps",
    title: "How the APS certificate works",
    summary:
      "You register online with APS India, enter your school, degree and language details, pay the fee and send your documents. Verification takes at least two weeks — longer when many people apply.",
    details: [
      "The APS fee is non-refundable once paid, whatever the outcome — choose the correct procedure and check the document checklist before you pay.",
      "APS India recommends paying online (CCAvenue); manual bank transfers make verification take longer.",
      "You are responsible for complete and authentic documents. Incomplete files cannot be assessed.",
    ],
    sources: ["apsProcess", "apsHome"],
    verifiedOn: "2026-10-09",
    reviewDays: 60,
    anchors: [{ source: "apsProcess", pattern: "at least two weeks" }, { source: "apsProcess", pattern: "non-refundable" }],
  },
  {
    id: "deutschlandstipendium",
    topic: "scholarships",
    title: "Deutschlandstipendium: €300 a month",
    summary:
      "The Deutschlandstipendium pays €300 per month — half from the federal government, half from private sponsors. It does not depend on your or your parents' income, and nationality does not matter, so international students can receive it.",
    details: [
      "Universities run the selection and pay the scholarship. Ask your university's scholarship office when its application round opens.",
      "Besides grades, universities also consider social engagement and obstacles you have overcome.",
    ],
    sources: ["deutschlandstipendium"],
    verifiedOn: "2026-10-09",
    reviewDays: 180,
    anchors: [{ source: "deutschlandstipendium", pattern: "300 euros" }, { source: "deutschlandstipendium", pattern: "nationality" }],
  },
  {
    id: "daad-scholarships",
    topic: "scholarships",
    title: "Search all scholarships in one place: the DAAD database",
    summary:
      "The DAAD scholarship database lists scholarships for international students from the DAAD and other organisations such as foundations. Filter it by your country (India), subject and degree level.",
    details: ["Real scholarships never ask you to pay a fee to apply or to receive money."],
    sources: ["daadScholarships"],
    verifiedOn: "2026-10-09",
    reviewDays: 180,
    anchors: [{ source: "daadScholarships", pattern: "scholarship" }],
  },
  {
    id: "blue-card",
    topic: "after-studies",
    title: "EU Blue Card salary thresholds (2026)",
    summary:
      "For an EU Blue Card in 2026 you need a job with a gross salary of at least €50,700 per year. A lower threshold of €45,935 per year applies to graduates whose degree is at most three years old and to shortage occupations.",
    details: ["The thresholds change every year. Check the current figures before you accept an offer."],
    sources: ["blueCard"],
    verifiedOn: "2026-10-09",
    reviewDays: 120,
    anchors: [{ source: "blueCard", pattern: "50\\.700" }, { source: "blueCard", pattern: "45\\.935" }],
  },
  {
    id: "final-fail",
    topic: "studies",
    title: "\"Endgültig nicht bestanden\" — failing an exam for good",
    summary:
      "Failed exams can be repeated, but only a limited number of times or within a deadline set by your exam regulations (Prüfungsordnung). If you fail for good, you are exmatriculated and — at least under Bremen's rules — cannot enrol in the same or an equivalent programme at any university in Germany.",
    details: [
      "Example: at the University of Bremen, failed module exams can be repeated within four semesters.",
      "Rules differ by state and by programme. Read your own Prüfungsordnung in your first semester and ask the exam office (Prüfungsamt) if anything is unclear.",
      "Losing your study place also affects your residence permit — get advice early if you are struggling.",
    ],
    sources: ["enbBremen"],
    verifiedOn: "2026-10-09",
    reviewDays: 365,
    anchors: [{ source: "enbBremen", pattern: "keiner Hochschule in Deutschland" }, { source: "enbBremen", pattern: "vier Semestern" }],
  },
  {
    id: "dw-german",
    topic: "german",
    title: "Learn German for free with Deutsche Welle",
    summary:
      "Deutsche Welle, Germany's public international broadcaster, offers free online German courses from level A1 to C1. Levels follow the European framework: A1–A2 basic, B1–B2 independent, C1–C2 proficient.",
    sources: ["dwLearnGerman"],
    verifiedOn: "2026-10-09",
    reviewDays: 365,
    anchors: [{ source: "dwLearnGerman", pattern: "Learn German free online" }, { source: "dwLearnGerman", pattern: "Independent users" }],
  },
  {
    id: "objection-deadline",
    topic: "letters",
    title: "Objecting to an official decision: one month",
    summary:
      "A formal objection (Widerspruch) against an administrative decision must be filed within one month after the decision was made known to you — in writing or as stated in the letter. If the decision has no or wrong instructions on how to object, the period is one year.",
    details: [
      "The decision's own 'Rechtsbehelfsbelehrung' tells you where to send the objection and what applies in your case — read it first.",
      "Keep the envelope: deadlines usually run from when you received the letter.",
    ],
    sources: ["vwgo70", "vwgo58"],
    verifiedOn: "2026-10-09",
    reviewDays: 365,
    anchors: [
      { source: "vwgo70", pattern: "innerhalb eines Monats" },
      { source: "vwgo58", pattern: "innerhalb eines Jahres" },
    ],
  },
  {
    id: "rundfunk-fee",
    topic: "letters",
    title: "Broadcasting fee: €18.36 per flat",
    summary:
      "Every flat in Germany pays the broadcasting fee (Rundfunkbeitrag) of €18.36 per month, no matter how many people live there. In a shared flat, one person pays and the others give the Beitragsservice that person's contribution number.",
    sources: ["rundfunk"],
    verifiedOn: "2026-10-09",
    reviewDays: 180,
    anchors: [{ source: "rundfunk", pattern: "18,36" }, { source: "rundfunk", pattern: "unabh.ngig davon, wie viele Personen" }],
  },
];
