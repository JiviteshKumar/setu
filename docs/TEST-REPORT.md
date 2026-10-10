# Setu — end-to-end test report

Test run of 9–10 October 2026 against a production build (`next build` + `next start`) and the development server,
at phone size (390 × 844), landscape phone (844 × 390) and desktop (1280 × 800).

## Result

**All checks pass after fixes.** 15 problems were found and fixed. 4 of them could mislead or block students:

1. Corrupted saved data crashed the whole app.
2. Searching "Munich" or "Nuremberg" missed most courses.
3. Typing "B.Tech CSE" in the dMAT checker found nothing.
4. The grade converter showed a German grade before the minimum passing grade was entered.

Nothing found is left open, apart from the limits listed at the end.

## What was tested

| Area | How | Result |
| --- | --- | --- |
| Type safety, code quality | `tsc`, `eslint` | ✓ |
| Facts | `check:facts`: all 21 facts re-checked against their 31 live official sources | ✓ all match |
| Data integrity | `test:data` (new): 1,612 courses, 177 map cities, 134 city guides, facts, sources and alerts | ✓ after fixes 5–7 |
| All pages and APIs | `test:routes` (new): 32 pages, 156 course/city pages, 169 internal links, 9 expected 404s, security headers, every API with valid and invalid input, manifest, service worker | ✓ |
| Pages in the browser | All 32 pages at phone width: loading, no sideways scrolling, labels on images/buttons/links/form fields, one main heading, console errors | ✓ after fix 8 |
| Course finder | Search (incl. XSS text, umlauts, English names), every filter with counts compared to the data, filter chips, "show more", map view, deep link `?city=`, save | ✓ after fix 2 |
| Course page | Non-EU deadlines only, official links, report form (validation, `javascript:` link rejected, valid report stored) | ✓ |
| My plan | Intake choice, status, checklist, notes, route line, reload persistence, remove, dates with years, calendar file | ✓ |
| dMAT checker | 25 real degree spellings against the official list | ✓ after fix 3 |
| dMAT practice | Generators (`test:prep`), training answer flow, partial scores, rating update, history | ✓ |
| Grade converter | Formula at all edges (best, worst, outside range, decimals) | ✓ after fix 4 |
| Cost planner | Totals, negative inputs | ✓ after fix 9 |
| Work-days tracker | § 16b rules: 20-hour week, semester break, two jobs a day, student assistant, full-time, ISO weeks over New Year, over-limit warning | ✓ after fix 10 |
| Letter explainer | Real letter (type, deadline, amount, reference, objection rule), local AI with quote guard (14 s), English text, 111 KB paste, script tags | ✓ after fix 11 |
| Jobs | Live search on the Federal Employment Agency board, safe external links | ✓ |
| Flat-scam checker | Severe and combined signs; never says "safe" | ✓ |
| City guides, senior connect | Spelling-tolerant search, OpenStreetMap links and attribution | ✓ |
| Community Q&A | Sign-in, post with HTML/script payload (shown as text, never runs), account deletion removes everything | ✓ |
| Corrupted saved data | Wrong-shaped values in all 15 storage keys, on 10 pages | ✓ after fix 1 |
| Phone app | Manifest, icons, iPhone settings, landscape intro, scroll lock released, offline logic (`test:sw`) | ✓ |

## Problems found and fixed

1. **Corrupted saved data crashed every page** ("This page couldn't load"). Every stored value is now checked against its expected shape: bad entries are repaired or dropped, valid ones are kept. A friendly error page is added as a last resort. New test: `test:storage`.
2. **Search missed courses for common spellings.** "Nuremberg" found 2 courses instead of 45, and "munchen", "muenchen" and "koln" found none. Search now ignores umlauts and accents and knows English names (Munich, Cologne, Nuremberg, Hanover, Bavaria …). This applies to the course finder, city guides and university list. New test: `test:search`.
3. **The dMAT checker missed how Indian students write degrees** ("B.Tech CSE", "computer science engg", "BE Civil"). Degree prefixes and short forms are now understood. "B.Sc IT" now lists the B.Sc entry before the engineering one. It still answers only from the official list.
4. **The grade converter showed a grade with the minimum passing grade still empty**, treating it as 0. Example: CGPA 8 showed 1.6, but the correct grade with a minimum of 5 is 2.2. It now waits for all three values and accepts "8,5".
5. **A broken university link** (course 11191, website without `https://`). Links are now fixed at build time.
6. **Two courses hidden by the intake filter** (11052, 11053): DAAD lists a winter deadline but no start semester. The intake is now taken from the deadline.
7. **The data build ran when another script imported it.** It now runs only when started directly.
8. **Two form fields without labels for screen readers** (Q&A university filter, dMAT degree box).
9. **The cost planner accepted negative amounts**, lowering the total.
10. **The work-days tracker silently ignored invalid hours.** It now says what is wrong.
11. **The letter explainer gave no hint when nothing was found** (wrong or misread text). It now says so and suggests checking the photo text.
12. **The service-worker cache could exceed its limit** (found by the new `test:sw`, fixed earlier).
13. **Cache-control and page tests:** expectations corrected (`test:routes`).
14. **"Remove from tracker"** renamed to "Remove from my plan".
15. **Two false "changed on DAAD" notices** created by a data fix were removed.

## Known limits (not bugs)

- **Service worker in the preview browser:** the embedded preview cannot run service workers. The offline logic is tested in a simulated environment (`test:sw`). It still needs a check on a real phone over HTTPS.
- **Timed sections and the mock exam:** their timers run on real time, which the hidden test browser pauses. The question generators and scoring are covered by `test:prep`; the timers were checked by hand when the feature was built.
- **City guides:** 134 of 164 cities so far. The rest are filled in by the weekly scheduled run.
- **Course finder page size:** 856 KB of HTML (90 KB compressed) because all courses are filtered on the phone. That is fine on mobile networks.

## Run everything again

```bash
npm run lint
npx tsc --noEmit
npm run test:prep
npm run test:letters
npm run test:intake
npm run test:sw
npm run test:data
npm run test:storage
npm run test:search
npm run check:facts
npm run build
npm start
npm run test:routes
```
