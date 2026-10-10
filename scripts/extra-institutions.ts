// Public institutions that award degrees but are not listed separately in the HRK register.
// Every entry needs an official source proving it is public. Research institutes (e.g. Max Planck institutes)
// are NOT universities and are deliberately not listed here.
import type { Institution } from "./fetch-institutions.ts";

export const EXTRA_INSTITUTIONS: (Institution & { source: string })[] = [
  {
    hrkId: "x-charite",
    shortName: "Berlin Charité",
    name: "Charité – Universitätsmedizin Berlin",
    displayName: "Charité – Universitätsmedizin Berlin",
    type: "Universitäten",
    // Public-law corporation and joint medical faculty of FU Berlin and HU Berlin (Berliner Universitätsmedizingesetz).
    sponsorship: "öffentlich-rechtlich",
    isPublic: true,
    state: "Berlin",
    students: null,
    founded: null,
    phdRights: true,
    city: "Berlin",
    homepage: "https://www.charite.de",
    domain: "charite.de",
    source: "https://www.berlin.de/sen/wissenschaft/einrichtungen/charite/artikel.646788.php",
  },
];
