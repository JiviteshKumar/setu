// Where Setu runs. Two builds come from the same code:
//   • full (npm run build + npm start on a Node server): everything, including the community Q&A, live job search,
//     today's exchange rate, mistake reports and the optional AI letter explanation;
//   • static (npm run build:static → GitHub Pages): plain files only. Server features are replaced by static ones
//     (data snapshots refreshed by the daily rebuild) or by links to the official site.

/** True in the static build for GitHub Pages. */
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/** URL prefix of the site, e.g. "/setu" on https://<user>.github.io/setu/. Empty on a server at the domain root. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Public repository (for "report a mistake" on the static site), e.g. https://github.com/<user>/setu. */
export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? "";

/** A file in public/ or a route outside next/link (manifest, icons, fetch): adds the base path. */
export const withBase = (path: string) => `${BASE_PATH}${path}`;
