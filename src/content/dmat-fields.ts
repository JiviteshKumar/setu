// Transcribed from the official APS India "dMAT India – List of Affected Previous Degree Fields",
// Version 1.0, 29 June 2026: https://aps-india.de/wp-content/uploads/2026/06/dMAT_India_Affected_Fields_List.pdf
// Keep the wording identical to the PDF. When APS publishes a new version, update DMAT_LIST_VERSION and the lists.

export const DMAT_LIST_VERSION = "Version 1.0 – 29 June 2026";

export const ENGINEERING = [
  "Advanced Manufacturing and Mechanical Systems Design", "Aerodynamic Engineering", "Aeronautical Engineering", "Aerospace Engineering",
  "Agricultural Engineering", "Architectural Engineering", "Applied Electronics and Instrumentation Engineering",
  "Applied Electronics and Telecommunications Engineering", "Automobile Engineering", "Automotive Engineering", "Automation Engineering",
  "Biochemical Engineering", "Biomedical Engineering", "Bio-Medical Engineering", "Bioengineering", "Biotechnology and Biochemical Engineering",
  "Biotechnology Engineering", "CAD/CAM Engineering", "Ceramic Engineering", "Ceramics Engineering", "Chemical Engineering",
  "Civil and Structural Engineering", "Civil Engineering", "Civil Engineering (Construction Technology)", "Civil Engineering (Public Health Engineering)",
  "Civil Engineering and Planning", "Civil Environmental Engineering", "Communication Engineering", "Communications Engineering",
  "Computer and Communication Engineering", "Computer Engineering", "Computer Engineering and Application", "Computer Networking and Engineering",
  "Computer Science and Engineering", "Computer Science Engineering", "Computer Science and Systems Engineering", "Construction Engineering",
  "Construction Engineering and Management", "Control System Engineering", "Design Engineering", "Electrical and Electronics Engineering",
  "Electrical and Instrumentation Engineering", "Electrical and Power Engineering", "Electrical Engineering", "Electrical Power Engineering",
  "Electronic Engineering", "Electronics and Communication Engineering", "Electronics and Computer Engineering", "Electronics and Electrical Engineering",
  "Electronics and Instrumentation Engineering", "Electronics and Telecommunication Engineering", "Electronics and Telecommunications Engineering",
  "Electronics Communication and Instrumentation Engineering", "Electronics Engineering", "Engineering Design", "Environment Engineering",
  "Environmental Engineering", "Environmental Engineering and Management", "Environmental Science and Engineering", "Fashion and Apparel Engineering",
  "Food Biotech Engineering", "Food Engineering", "Food Engineering and Technology", "Geotechnical Engineering", "Health Science and Water Engineering",
  "Hydraulics Engineering", "Industrial and Production Engineering", "Industrial Engineering", "Industrial Engineering and Management",
  "Industrial Production Engineering", "Industrial Safety and Engineering", "Industrial Systems Engineering", "Information Engineering",
  "Information Science and Engineering", "Information Technology and Engineering", "Infrastructure Engineering", "Infrastructure Engineering and Management",
  "Instrumentation and Control Engineering", "Instrumentation Engineering", "Irrigation and Drainage Engineering", "Irrigation Engineering",
  "Machine Engineering", "Maintenance Engineering", "Manufacturing Engineering", "Manufacturing Engineering and Automation",
  "Manufacturing Engineering and Management", "Manufacturing Science and Engineering", "Manufacturing Systems Engineering", "Marine Engineering",
  "Materials Engineering", "Mechanical and Automation Engineering", "Mechanical Engineering", "Mechanical Engineering Design", "Mechanical System Design",
  "Mechatronics Engineering", "Medical Electronics Engineering", "Metallurgical and Materials Engineering", "Metallurgical Engineering",
  "Mining Engineering", "Naval Architecture and Ocean Engineering", "Network Engineering", "Optical Engineering", "Petrochemical Engineering",
  "Petroleum Engineering", "Plastic Engineering", "Plastics Engineering", "Polymer Engineering", "Power Electronics Engineering", "Power Engineering",
  "Power Systems Engineering", "Production and Industrial Engineering", "Production Engineering", "Propulsion Engineering",
  "Robotics and Automation Engineering", "Safety and Fire Engineering", "Shipbuilding Engineering", "Software Engineering, if awarded as an Engineering degree",
  "Soil and Water Conservation Engineering", "Structural Engineering", "Telecommunication Engineering", "Textile Engineering", "Textile Plant Engineering",
  "Thermal Engineering", "Tool and Die Engineering", "Tool Engineering", "Transportation Engineering", "Transportation Engineering and Management",
  "Transportation System Engineering", "Water Resource Engineering",
];

export const COMMERCE_FINANCE_ECONOMICS = [
  "Bachelor of Commerce / B.Com / BCom", "B.Com Honours / B.Com (Hons)", "B.Com Accounting", "B.Com Accounting and Finance", "B.Com Banking and Insurance",
  "B.Com Computer Applications", "B.Com Corporate Secretaryship", "B.Com e-Commerce", "B.Com Finance", "B.Com Foreign Trade", "B.Com Forensic Accounting",
  "B.Com International Business and Finance", "B.Com Investment and Wealth Management", "B.Com Marketing", "B.Com Professional", "B.Com Risk Management",
  "B.Com Taxation", "B.Com Tourism and Travel Management, if awarded as a Commerce degree and formally assessed accordingly", "Commerce",
  "Commerce General", "Commerce Honours", "Commerce Professional", "Commerce with Computer Applications", "Commerce with Computers",
  "Commerce and Co-operation", "Commerce with Corporate Secretaryship", "Commerce with Finance and Taxation", "Commerce with Tax Procedure and Practice",
  "Accounting", "Accountancy", "Accounting and Finance", "Accounts and Finance", "Finance and Accounting", "Accounting and Financial Management",
  "Accounting and Taxation", "Accounting and Auditing", "Advanced Accounting and Auditing", "Advance Accounting and Auditing", "Auditing",
  "Corporate Accounting", "Cost Accounting", "Cost and Works Accounting", "Financial Accounting and Auditing", "Professional Accounting", "Finance",
  "Financial Management", "Finance Management", "Finance and Taxation", "Taxation and Finance", "Banking and Finance", "Banking and Insurance",
  "Insurance", "Financial Markets", "Capital Markets", "Financial Services", "International Finance", "International Accounting and Finance",
  "International Finance and Accounting", "Corporate Finance", "Investment Management",
  "Risk Management, if awarded as a Commerce, Finance, Economics or Business degree", "Taxation", "Economics", "Bachelor of Economics", "B.A. Economics",
  "B.Sc. Economics", "Economics Honours", "Applied Economics", "Business Economics", "Financial Economics", "Economics and Finance",
  "International Economics", "International Economics and Finance", "Development Economics",
  "Foreign Trade, if awarded as a Commerce, Finance, Economics or Business degree",
];

export const BUSINESS_MANAGEMENT = [
  "Bachelor of Business Administration / BBA", "Bachelor of Business Management / BBM", "Bachelor of Management Studies / BMS",
  "Bachelor of Business Studies / BBS", "Bachelor of Business Economics / BBE", "Bachelor of International Business and Finance / BIBF",
  "Business Administration", "Business Management", "Management Studies", "Business Studies", "General Management", "International Business",
  "International Business Management", "International Business and Finance", "Foreign Trade, if awarded as a Business or Management degree",
  "Business Analytics", "Business Economics", "Information Systems Management", "Rural Management", "Business Administration with Finance",
  "Business Administration with Marketing", "Business Administration with Human Resource Management", "Business Administration with International Business",
  "Business Administration with Business Analytics", "Business Administration with Financial Management", "Business Administration with Computer Applications",
  "Marketing", "Marketing Management", "Digital Marketing", "Human Resource Management", "Human Resources", "HR Management",
  "Human Resource Development", "Operations Management", "Logistics Management", "Logistics and Supply Chain Management", "Supply Chain Management",
  "Retail Management", "Entrepreneurship", "Business Entrepreneurship", "Financial Management, if awarded as part of a Business or Management degree",
];

// Section 5: not classified by name alone — APS assesses separately.
export const SEPARATE_ASSESSMENT = [
  "BBA Hotel Management / BBA Hospitality Management", "BBA Tourism and Travel Management / BBA Travel and Tourism Management",
  "BBA Aviation Management / BBA Airline and Airport Management / BBA Airport Management", "BBA Hospital Administration / BBA Healthcare Management",
  "Bachelor of Hotel Management / BHM", "Bachelor of Hotel Management and Catering Technology / BHMCT", "Bachelor of Tourism and Travel Management / BTTM",
  "Hotel Management / Hospitality Management / Hotel Management and Catering Technology / Hospitality and Hotel Administration",
  "Tourism Management / Travel and Tourism Management / Tourism and Hospitality Management",
  "Aviation Management / Airline and Airport Management / Airport Management", "Hospital Administration / Healthcare Management",
  "Construction Management / Infrastructure Management / Sports Management",
];

// Section 6: not automatically included.
export const NOT_AUTOMATICALLY_INCLUDED = [
  "Standalone Technology degrees without an Engineering designation", "B.Tech with a non-Engineering or unclear branch/specialisation",
  "Information Technology as a standalone field", "Information and Communication Technology as a standalone field",
  "Information Science and Technology as a standalone field", "Computer Applications", "Bachelor of Computer Applications / BCA",
  "Computer Science without Engineering designation", "B.Sc. Computer Science", "B.Sc. Information Technology", "B.Sc. Data Science",
  "Artificial Intelligence as a standalone field", "Artificial Intelligence and Machine Learning as a standalone field",
  "Data Science as a standalone field", "Cyber Security as a standalone field", "Biotechnology without Engineering designation", "B.Sc. Biotechnology",
  "B.Sc. Medical Biotechnology", "Microbiology", "Life Sciences", "Food Technology without Engineering designation",
  "Food Processing Technology without Engineering designation", "Textile Technology, unless awarded as Textile Engineering", "Leather Technology",
  "Packaging Technology", "Printing Technology", "Rubber Technology", "Architecture", "Planning", "Town Planning", "Interior Design",
  "Urban and Regional Planning", "Pharmacy", "Pharmaceutical Sciences", "Pharmaceutical Biotechnology", "Pharma Technology",
  "Agriculture, unless awarded as Agricultural Engineering", "Medical, Nursing, Physiotherapy and other health-science degrees", "Law", "Education",
  "Library and Information Sciences", "Pure Sciences, except Economics where listed above", "Arts, except Economics where listed above", "Humanities",
  "Social Sciences, except Economics where listed above",
];

export type FieldGroup = "engineering" | "commerce" | "business" | "separate" | "not-included";

export const FIELD_GROUPS: { group: FieldGroup; label: string; items: string[] }[] = [
  { group: "engineering", label: "Engineering", items: ENGINEERING },
  { group: "commerce", label: "Commerce / Accounting / Finance / Economics", items: COMMERCE_FINANCE_ECONOMICS },
  { group: "business", label: "Business / Management", items: BUSINESS_MANAGEMENT },
  { group: "separate", label: "Requires separate formal assessment by APS", items: SEPARATE_ASSESSMENT },
  { group: "not-included", label: "Not automatically included", items: NOT_AUTOMATICALLY_INCLUDED },
];

const norm = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/\./g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// The degree type in front of a branch ("B.Tech", "BE", "Bachelor of Engineering in …") is not part of the field name.
const DEGREE_PREFIX = /^(b ?tech|b ?e|b ?sc|bachelor of (technology|engineering|science)|bachelors? (of|in))( in)?\s+/;

// Short forms students write, expanded word by word ("computer science engg" → "computer science engineering").
const WORD_FORMS: Record<string, string> = {
  engg: "engineering",
  comp: "computer",
  sci: "science",
  cs: "computer science",
  it: "information technology",
  ds: "data science",
  ml: "machine learning",
  mgmt: "management",
  mgt: "management",
};

// Common Indian abbreviations, expanded to the wording used in the official list.
const ABBREVIATIONS: Record<string, string> = {
  cse: "computer science and engineering",
  ece: "electronics and communication engineering",
  eee: "electrical and electronics engineering",
  eie: "electronics and instrumentation engineering",
  ise: "information science and engineering",
  mech: "mechanical engineering",
  civil: "civil engineering",
  aiml: "artificial intelligence and machine learning",
  "ai ml": "artificial intelligence and machine learning",
};

/** Search the official list. Returns matches only — never a guess about fields not in the list. */
export function searchFields(query: string) {
  const full = norm(query);
  const degreeType = full.match(DEGREE_PREFIX)?.[1]?.replace(/\s/g, "") ?? null; // "bsc", "btech", …
  let q = full.replace(DEGREE_PREFIX, "");
  q =
    ABBREVIATIONS[q] ??
    q
      .split(" ")
      .map((w) => ABBREVIATIONS[w] ?? WORD_FORMS[w] ?? w)
      .join(" ");
  if (q.length < 2) return [];
  const words = q.split(" ");
  const results: { group: FieldGroup; label: string; item: string; exact: boolean }[] = [];
  for (const g of FIELD_GROUPS) {
    for (const item of g.items) {
      const n = norm(item);
      const exact = n === q || n.split(" / ").includes(q);
      if (exact || words.every((w) => n.includes(w))) results.push({ group: g.group, label: g.label, item, exact });
    }
  }
  // Exact matches first, then entries with the degree type the student typed ("B.Sc IT" → "B.Sc. Information
  // Technology" before "Information Technology and Engineering"), then those starting with the query, then the shortest.
  const starts = (item: string) => Number(norm(item).startsWith(q));
  const sameType = (item: string) => Number(!!degreeType && norm(item).replace(/\s/g, "").includes(degreeType));
  return results
    .sort((a, b) => Number(b.exact) - Number(a.exact) || sameType(b.item) - sameType(a.item) || starts(b.item) - starts(a.item) || a.item.length - b.item.length)
    .slice(0, 12);
}
