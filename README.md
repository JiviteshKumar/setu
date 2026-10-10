# Setu — Master's in Germany, verified

A free, mobile-first web app for Indian students planning a Master's at a **public** German university, and for living in Germany afterwards. Every fact shows its official source and the date it was last checked. (*Setu* is a working name, change it in `src/lib/site.ts`.)

## What's in it

| Area | Pages | Data source |
|---|---|---|
| Course finder | `/programmes`, `/programmes/[id]` | DAAD International Programmes database, filtered to public institutions via the HRK Hochschulkompass register |
| My plan (intake planner + tracker) | `/tracker` | Student's own browser (localStorage); DAAD deadlines placed in the right year for the chosen intake; `.ics` export with opening-day and 30/7-day deadline reminders |
| dMAT checker | `/tools/dmat` | APS India dMAT page + official affected-fields PDF (v1.0, 29 June 2026), transcribed word for word |
| Grade converter | `/tools/grade` | KMK modified Bavarian formula |
| Cost planner (₹) | `/tools/costs` | German Missions in India (blocked account), ECB reference rate (live) |
| Verified updates | `/updates` | `src/content/facts.ts` — every fact has official sources + anchors |
| Part-time jobs | `/jobs` | Federal Employment Agency job board API (live) |
| dMAT practice | `/prep` | g.a.s.t. official format; original generated questions |
| Letter explainer, city guides, senior connect | `/germany/letters`, `/cities`, `/connect` | Browser OCR + rules; OpenStreetMap; DAAD support data |
| Living in Germany | `/germany`, `/germany/housing`, `/germany/work` | German law (§16b AufenthG, §17 BMG, §5 SGB V), police crime prevention, consumer advice centres |

## Design & motion

The visual language is the journey India → Germany ("Setu" means bridge):

| Element | Where | Component |
|---|---|---|
| Night-flight map: arcs from 6 Indian cities to Germany, plane on the Delhi route | Home hero | `src/components/JourneyMap.tsx` |
| Map of Germany with a dot per university city (tap to filter) | Home, Courses → Map | `src/components/GermanyMap.tsx` |
| Boarding pass with tear line | Course detail | `src/components/Ticket.tsx` |
| U-Bahn line diagram with stations, "you are here" marker and DONE stamps | Tracker (U1), arrival checklist (S2) | `src/components/MetroLine.tsx` |
| Rubber stamps for verdicts | dMAT result, scam check | `Stamp` in `src/components/motion.tsx` |
| Ticket-validator gauge | 140-day work tracker | `src/components/Gauge.tsx` |
| Departure-board deadlines (`T−22d`) | Course list, tracker | `ProgrammeBrowser.tsx`, `Tracker.tsx` |

Motion uses the `motion` library. Shared building blocks live in `src/components/motion.tsx` (`Reveal`, `Stagger`, `AnimatedNumber`, `Stamp`, `PageEnter`). There's an **Animations: Auto / On / Off** switch in the footer. Auto follows the device's "reduce motion" setting, On overrides it, and Off skips every animation. Looping decorations only render after hydration (`useMotionAllowed`), so server and client HTML always match.

Map data: Natural Earth via `world-atlas` (public domain) and OpenStreetMap Nominatim geocoding (© OpenStreetMap contributors), built by `npm run data:map`.

## Commands

```bash
npm run dev               # start the app on http://localhost:3000
npm run data:institutions # download the HRK list of all German universities (public/private)
npm run data:programmes   # crawl DAAD Master's programmes (cached in data/raw, 1 request/second)
npm run data:map          # build map outlines + geocode university cities (cached)
npm run data:build        # build data/programmes.json + data/qa-report.json
npm run data:cities       # OpenStreetMap city guides (resumable; --max-new N, --cached-only, --refresh)
npm run check:facts       # re-download every official source; fails if any fact's source changed
npm run alerts:watch      # snapshot official pages, queue changes for review in /admin
npm run test:prep         # validate thousands of generated dMAT items (unique answers, no filler options)
npm run test:letters      # letter explainer test cases
npm run test:intake       # intake date rules, checked against every real DAAD deadline
npm run test:sw           # offline logic of the installed app
npm run test:data         # integrity of courses, map, city guides, facts, sources, alerts
npm run test:storage      # corrupted data on the device never breaks a page
npm run test:search       # Munich/München/munchen find the same courses; dMAT degree names
npm run test:routes       # every page, link, 404, header and API of a running server (see docs/TEST-REPORT.md)
npm run build             # production build
npm run build:static      # static site for GitHub Pages (out/); see docs/DEPLOY.md
```

To refresh course data, delete `data/raw/daad` and run the `data:` scripts in the order above.

## How we keep information correct

1. **Only official sources.** German law, German government and missions, APS India, g.a.s.t., DAAD, HRK, universities. No blogs, consultants or forums (`src/content/sources.ts`).
2. **No guessing.** Deadlines written as conditional free text are shown in their original wording, not converted into dates. Universities that can't be matched to the HRK register with certainty are left out.
3. **Automatic cross-checks** in `scripts/build-programmes.ts` flag contradictions, e.g. a Baden-Württemberg or TUM course listed as tuition-free, or a course taught outside Germany. These show as "Please double-check" on the course page, and everything uncertain lands in `data/qa-report.json`.
4. **Source anchors.** Every fact in `src/content/facts.ts` lists phrases that must appear on its source page. `npm run check:facts` re-downloads every source and exits with an error if any anchor disappears, which means the page changed and a person must re-verify.
5. **Review dates.** Each fact has `verifiedOn` + `reviewDays`. Past that window the app shows "may be outdated" automatically.
6. **Personal data stays on the device.** No accounts, nothing stored on a server.

## Update alerts (phase 2)

```
official pages ──► npm run alerts:watch ──► data/watch/pending ──► /admin (you review) ──► data/alerts.json ──► rebuild ──► /alerts + bell
                     │ snapshot diff                ▲
                     │ relevance score              │ student "Report a mistake" (/api/report → data/watch/reports)
                     │ facts whose anchors broke
                     └ local AI draft (Ollama, qwen3.5:4b) + number/date guard
DAAD weekly refresh ──► data:build ──► data/programme-changes.json ──► "Changed since you saved" in the tracker (automatic: it's official data)
```

- `npm run alerts:watch` — snapshots every official source in `src/content/sources.ts` and queues real changes. First run stores baselines. Exit code 2 = something to review.
- **AI drafts** (`scripts/ai-draft.ts`) run only if Ollama is running locally with `qwen3.5:4b` (override with `OLLAMA_MODEL`). Temperature 0, the model sees only the changed official text, and `guardDraft` rejects any draft containing a number, date or month that isn't in that text, or a link. The draft is a suggestion; you write/approve the alert.
- **Review** at `http://localhost:3000/admin` (exists only in `next dev`, never in a production build): diff of the official page, broken fact anchors, AI draft + guard result, approve/edit/dismiss. Every decision is archived in `data/watch/done`.
- **Course changes**: `data:build` compares with the previous build and records changed deadlines, fees and requirements for 180 days. `npm run data:programmes -- --refresh` re-downloads pages (old copies are kept if a download fails, and removals are ignored if more than 5% of courses vanish at once).
- **Intake planner** (`src/lib/intake.ts`, tested by `npm run test:intake`): the student picks an intake ("Winter 2027"). DAAD lists dates without a year, so each closing date is placed in the twelve months before that semester. For winter, January–October falls in the same year and November–December in the year before; for summer, January–April falls in the same year and May–December in the year before. Each opening date is the last occurrence before its closing date.
  - Dates that DAAD writes with a different year are flagged, and so are texts that list several rounds.
  - Updates for saved courses ("opens in 23 days", "open now", "deadline in 12 days", "closed for Winter 2027") appear on My plan, on the alerts page and in the bell.
  - The course finder can filter by "deadline not passed" or "open now" for the chosen intake.
  - The plan's steps use only verified facts (dMAT, APS, blocked account, visa, insurance, address registration).
- **EU-only deadlines are dropped** at build time (`isEuOnly` in `build-programmes.ts`), so Indian applicants never see a deadline meant for EU applicants.
- **Schedule**: `scripts/run-checks.ps1` runs the daily checks (and the Sunday data refresh) and shows a Windows notification when a review is needed. Register it with `powershell -ExecutionPolicy Bypass -File scripts\register-schedule.ps1`. Logs: `data/watch/logs`.

## dMAT practice (phase 3)

`/prep` (dashboard) · `/prep/train/<type>` (adaptive, explanations) · `/prep/timed/<type>` (exam pace) · `/prep/mock` (full mock with break).

- **Format** comes from the official g.a.s.t. documents (preparation materials as at 02.09.2026, candidate information 26.09.2026): Core Module = Figure Sequences, Mathematical Equations, Latin Squares (20 tasks / 25 min each); Subject Module = General Academic Module (90 min, texts + single-choice questions with 4 options). No notes or calculators.
- **Questions are original.** Official exercises are copyrighted and were only read to learn the rules. Core tasks are generated by code that applies the published rules (`src/lib/prep/figures.ts`, `equations.ts`, `latin.ts`), so the answer is right by construction. Each item is verified before use: equation systems must have exactly one solution in 1–20, Latin-square "?" must be forced by elimination, figure options must be distinct, in the grid and non-overlapping. Subject texts (`subject.ts`) are written for Setu with randomised numbers and computed answers.
- `npm run test:prep` stress-tests thousands of generated items (all levels, all passages); run it after any change.
- **Adaptive:** per-task rating (`engine.ts`, Elo-style); next item difficulty targets ~70% success; ratings/history stay on the device. Only attempted questions change the rating.
- **Keeping up with the real exam:** the watcher fingerprints the official dMAT PDFs and watches the d-mat.de page; a new version lands in `/admin` so the generators can be checked against the new rules. There is no history of real questions to predict from, and the app says so.
- Robustness: first-load content is never hidden behind an entrance animation, and timed sections never wait for an exit animation.

## Living in Germany helpers (phase 4)

- **German letter explainer** (`/germany/letters`): photo → text with tesseract.js **in the browser** (the photo is never uploaded; only the German model is downloaded once from the jsDelivr CDN), or paste. `src/lib/letters/analyze.ts` finds the sender type, deadlines, appointments, time limits, amounts, reference numbers and requested actions — each **quoted from the letter** — plus scam signs (gift cards/crypto, threats + payment, foreign IBAN for a German authority, demands without references). `glossary.ts` explains ~60 official terms. Verified rules shown when relevant: objection within one month (§ 70 VwGO), one year if instructions are missing (§ 58 VwGO), broadcasting fee €18.36 per flat.
  - Optional AI explanation (`/api/letter-ai`) — **off unless `SETU_LETTER_AI=1`** and a local Ollama model is running. Every step must quote the letter verbatim (else dropped); summaries with numbers/dates not in the letter are rejected (`src/lib/guard.ts`, shared with the alert pipeline). Letter text is not stored.
- **City guides** (`/cities`, `/cities/<slug>`): OpenStreetMap data (© OpenStreetMap contributors, ODbL) for every city with a public-university Master's: supermarkets by chain, Indian/Asian groceries (by name — flagged as such), Indian restaurants, Hindu temples & gurdwaras, pharmacies, hospitals, main station; plus each university's own living-cost and accommodation notes from DAAD. `npm run data:cities` makes one small Overpass query per city (5 s apart, two public Overpass servers, cached in `data/raw/osm`), saves progress every 10 cities and can be resumed. Cities whose query failed are left out rather than shown with partial data; the weekly scheduled run fills in up to 20 missing cities.
- **Senior connect** (`/connect`): official support per public university from DAAD (buddy programme, welcome event, pick-up, accommodation and visa help …), safety rules for WhatsApp/Telegram groups, questions worth asking.
- **Verified-senior Q&A** (`/connect/ask`):
  - Sign-in is by email without a password. The emailed link opens a page with a button, and the single-use token is only spent on that button press, so university mail scanners can't use it up.
  - The ✓ verified badge only goes to email domains of public universities in the HRK register, and only verified students can answer.
  - Posts with phone numbers, emails, private-chat links, payment/agent wording or non-official links are held for a moderator (`/moderate`). Three reports hide a post. Each user can post at most 5 times per hour.
  - Users can delete their account and all their posts.
  - Data lives in `data/community.db` (SQLite built into Node). Unknown course, city and question addresses return a real 404 (`src/proxy.ts`).

## Phone app (installable)

Setu installs from the browser like an app ("Add to Home Screen" / Chrome's install button). No app store is needed.

- **Manifest** (`src/app/manifest.ts`):
  - Runs full screen.
  - The launch screen uses the same night navy as the opening animation, so the phone's splash flows into it.
  - Long-pressing the icon gives shortcuts to My plan, Courses, dMAT practice and Alerts.
- **Icons**: generated from the bridge logo by `npm run data:icons`. This builds the normal icons, the maskable icon, the iPhone icon and the favicon.
- **iPhone**: full-screen launch, transparent status bar, and pages padded with `env(safe-area-inset-*)` for the notch, home bar and landscape. The home page shows "Add to Home Screen" instructions; on Android it shows an Install button.
- **Inside the app**:
  - A back button appears in the header on inner pages, because installed apps have no browser back button.
  - The opening animation plays once per launch. It locks scrolling and pull-to-refresh while it runs and uses lightweight effects for slower phones.
- **Offline** (`public/sw.js`, tested by `npm run test:sw`):
  - Pages are fetched from the network first and kept for offline reading. Without a connection, the last copy or `/offline` is shown.
  - Build files are cached.
  - API calls, sign-in, community and moderation pages are never cached.
  - Bump `VERSION` in `sw.js` to clear old caches.

## Roadmap

- **Phase 2 — update alerts:** done (see above).
- **Phase 3 — dMAT prep:** done (see above), 15 subject texts. Next: figure tasks on larger grids if g.a.s.t. uses them, optional anonymous difficulty calibration once hosted.
- **Phase 4 — Germany helpers:** done, including the verified-senior Q&A.

## Before going public

- Ask DAAD and HRK for permission to reuse their data. Drafts (not sent) are in [docs/permission-requests.md](docs/permission-requests.md).
- Hosting, environment variables, moderation, backups and scheduled jobs: see [docs/DEPLOY.md](docs/DEPLOY.md).
