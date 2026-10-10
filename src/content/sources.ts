// Every fact shown in the app points to one of these sources. Only official
// (government, law, university, or the body that runs a process) sources go here.
export type Source = {
  name: string;
  url: string;
  kind: "law" | "government" | "official-body" | "university";
  /** Set when the site blocks automated requests: the source is only linked, never used for a fact, and not auto-checked. */
  linkOnly?: string;
  /** Set for pages whose content changes constantly (e.g. daily lessons): the watcher only checks fact anchors, not every change. */
  noisy?: string;
};

export const SOURCES = {
  apsDmat: { name: "APS India – dMAT for selected Master's applicants", url: "https://aps-india.de/dmat/", kind: "official-body" },
  apsDmatFields: {
    name: "APS India – dMAT affected fields list (v1.0, 29 June 2026)",
    url: "https://aps-india.de/wp-content/uploads/2026/06/dMAT_India_Affected_Fields_List.pdf",
    kind: "official-body",
  },
  apsHome: { name: "APS India", url: "https://aps-india.de/", kind: "official-body" },
  dmatSite: { name: "g.a.s.t. – dMAT in India", url: "https://www.d-mat.de/en/dmat-in-india/", kind: "official-body" },
  dmatPrepPdf: {
    name: "g.a.s.t. – dMAT preparatory materials, General Academic Module (as at 02.09.2026)",
    url: "https://www.d-mat.de/wp-content/uploads/2026/09/260902_dMAT_General-Academic-Module_Preparatoy-Materials_EN.pdf",
    kind: "official-body",
  },
  dmatCandidates: {
    name: "g.a.s.t. – information for dMAT exam candidates (26 Sept 2026)",
    url: "https://www.d-mat.de/wp-content/uploads/2026/09/202609_Info_dMAT_Candidates.pdf",
    kind: "official-body",
  },
  dmatRegister: {
    name: "g.a.s.t. – dMAT test centres and registration",
    url: "https://www.gast.de/portal/center-search/center-search/dmat/exams/worldwide?lang=en",
    kind: "official-body",
  },
  aufenthg16b: { name: "§ 16b Residence Act (AufenthG) – studies", url: "https://www.gesetze-im-internet.de/aufenthg_2004/__16b.html", kind: "law" },
  aufenthg20: { name: "§ 20 Residence Act (AufenthG) – job seeking", url: "https://www.gesetze-im-internet.de/aufenthg_2004/__20.html", kind: "law" },
  bmg17: { name: "§ 17 Federal Registration Act (BMG)", url: "https://www.gesetze-im-internet.de/bmg/__17.html", kind: "law" },
  sgb5: { name: "§ 5 Social Code Book V (SGB V)", url: "https://www.gesetze-im-internet.de/sgb_5/__5.html", kind: "law" },
  blockedAccount: {
    name: "German Missions in India – Studies visa (page dated 16 Feb 2026)",
    url: "https://india.diplo.de/in-en/service/2756350-2756350",
    kind: "government",
  },
  indiaStudyVisa: {
    name: "German Missions in India – Studies visa",
    url: "https://india.diplo.de/in-en/service/2756350-2756350",
    kind: "government",
  },
  remonstration: {
    name: "German Foreign Office – abolition of the remonstration procedure",
    url: "https://www.auswaertiges-amt.de/de/newsroom/2724844-2724844",
    kind: "government",
  },
  bwFees: {
    name: "Baden-Württemberg Ministry of Science – fees for international students",
    url: "https://mwk.baden-wuerttemberg.de/de/hochschulen-studium/studieren-in-bw/studienfinanzierung/gebuehren-fuer-internationale-studierende-und-zweitstudium/tuition-fees-for-international-students",
    kind: "government",
  },
  tumFees: { name: "TUM – tuition fees for students from non-EU countries", url: "https://www.tum.de/en/studies/fees/tuition", kind: "university" },
  kmkGrade: {
    name: "KMK – modified Bavarian formula (Vereinbarung über die Festsetzung der Gesamtnote)",
    url: "https://www.kmk.org/fileadmin/Dateien/pdf/ZAB/Hochschulzugang_Beschluesse_der_KMK/GesNot05.pdf",
    kind: "government",
  },
  ecb: { name: "European Central Bank – euro reference rates", url: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html", kind: "government" },
  daad: { name: "DAAD International Programmes database", url: "https://www2.daad.de/deutschland/studienangebote/international-programmes/en/", kind: "official-body" },
  hrk: { name: "Hochschulkompass (German Rectors' Conference)", url: "https://www.hochschulkompass.de/hochschulen/downloads.html", kind: "official-body" },
  baJobs: { name: "Federal Employment Agency (Bundesagentur für Arbeit) – Jobsuche", url: "https://www.arbeitsagentur.de/jobsuche/", kind: "government" },
  vwgo70: { name: "§ 70 Code of Administrative Court Procedure (VwGO) – objection deadline", url: "https://www.gesetze-im-internet.de/vwgo/__70.html", kind: "law" },
  vwgo58: { name: "§ 58 VwGO – missing or wrong instructions on legal remedies", url: "https://www.gesetze-im-internet.de/vwgo/__58.html", kind: "law" },
  rundfunk: { name: "ARD ZDF Deutschlandradio Beitragsservice", url: "https://www.rundfunkbeitrag.de/", kind: "official-body" },
  apsProcess: { name: "APS India – APS process", url: "https://aps-india.de/aps-process/", kind: "official-body" },
  deutschlandstipendium: {
    name: "Federal Ministry of Research – Deutschlandstipendium (English)",
    url: "https://www.deutschlandstipendium.de/deutschlandstipendium/de/services/english/the-deutschlandstipendium-best-of-both-worlds-for-students.html",
    kind: "government",
  },
  daadScholarships: {
    name: "DAAD scholarship database",
    url: "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/",
    kind: "official-body",
  },
  blueCard: {
    name: "German Foreign Office – EU Blue Card visa information (thresholds as of 2026)",
    url: "https://tiflis.diplo.de/ge-de/service/visum/2722112-2722112",
    kind: "government",
  },
  enbBremen: {
    name: "University of Bremen – definitively failed (endgültig nicht bestanden)",
    url: "https://www.uni-bremen.de/studium/starten-studieren/pruefungen/endgueltig-nicht-bestanden",
    kind: "university",
  },
  dwLearnGerman: {
    name: "Deutsche Welle – Learn German",
    url: "https://learngerman.dw.com/en/overview",
    kind: "government",
    noisy: "publishes a new lesson every day",
  },
  goetheIndia: {
    name: "Goethe-Institut / Max Mueller Bhavan India – German exams",
    url: "https://www.goethe.de/ins/in/en/spr/prf.html",
    kind: "official-body",
    linkOnly: "goethe.de blocks automated requests",
  },
  charite: {
    name: "Berlin Senate – Charité Universitätsmedizin Berlin",
    url: "https://www.berlin.de/sen/wissenschaft/einrichtungen/charite/artikel.646788.php",
    kind: "government",
  },
} satisfies Record<string, Source>;

export type SourceKey = keyof typeof SOURCES;
