# Deploying Setu

There are two ways to run Setu:

| | GitHub Pages (static) | Your own Node server (full) |
| --- | --- | --- |
| Cost | free | a small server |
| Course finder, My plan, dMAT practice, tools, guides, letter explainer, phone app, offline | ✓ | ✓ |
| Exchange rate | ECB rate saved by the daily rebuild (its date is shown) | today's rate |
| Job search | opens the official Bundesagentur search with your words | results shown inside Setu |
| Report a mistake | opens a pre-filled GitHub issue | review queue on the server |
| Senior Q&A, AI letter explanation | — (need a server and a database) | ✓ |

## GitHub Pages

`.github/workflows/pages.yml` runs on every push to `main`, daily at 09:00 IST (fresh exchange rate) and on demand.
It does three things:

1. Runs the checks (`tsc`, lint, `test:data`, `test:storage`, `test:search`, `test:intake`, `test:sw`).
2. Builds the static site with `npm run build:static`.
3. Publishes `out/`.

Setup (once): repository **Settings → Pages → Source: GitHub Actions**. The site appears at
`https://<user>.github.io/<repo>/`.

How the static build works:

- `next.config.ts` switches to `output: "export"` with the repository's base path.
- Route files named `*.server.tsx` / `*.server.ts` (APIs, Q&A, moderation, admin, proxy) are left out.
- `scripts/build-public.ts` writes `manifest.webmanifest`, `programme-status.json` and `fx.json` into `public/`.

To try it locally:

```bash
NEXT_PUBLIC_BASE_PATH=/setu npm run build:static
```

The result is in `out/`.

Data refreshes (DAAD crawl, city guides, alerts) still run on your own computer (section 5). Commit the updated
`data/` files and push; the next Pages build publishes them.

## Your own server

Setu is a normal Next.js app that runs with `next start` on a Node server. It is **not** suited to serverless hosting:
the course data, city guides and alerts are files in `data/`, and the senior Q&A keeps a small SQLite database in
`data/community.db`. You need one machine (a small VPS is enough) with a disk that survives restarts.

## 1. Requirements

- Node.js **24** or newer (the scripts use Node's built-in TypeScript support and `node:sqlite`).
- A domain with HTTPS in front of the app (Caddy or nginx as a reverse proxy).
- A writable `data/` folder next to the app.
- An email account that can send mail over SMTP (for Q&A sign-in links). A free mailbox with an app password is
  enough at the start, for example `smtps://user:app-password@smtp.gmail.com:465`.
- Optional: a machine with a GPU running [Ollama](https://ollama.com) for the AI drafts (alerts) and the AI letter
  explanation. Setu works fully without it.

## 2. Build and start

```bash
npm ci
# Data: either copy data/*.json from your development machine, or build it on the server:
npm run data:institutions
npm run data:programmes
npm run data:map
npm run data:build
npm run data:cities          # slow; can be resumed, run it again to fill in missing cities
npm run check:facts          # must pass before you deploy
npm run test:prep
npm run test:letters
npm run test:intake
npm run test:sw
npm run build
PORT=3000 npm start
```

Course pages and city pages are generated at build time from `data/`. After refreshing the data, **run
`npm run build` again and restart** the app. Alerts (`data/alerts.json`) and the Q&A database are read while the app
runs and need no rebuild.

Run the app as a service (systemd, pm2 …) so it restarts after crashes and reboots.

## 3. Environment variables

Put these in `.env.production.local` (never commit it) or in your service definition.

| Variable | Needed | What it does |
| --- | --- | --- |
| `SETU_SITE_URL` | **yes**, for the Q&A | Public address, e.g. `https://setu.example`. Sign-in links in emails always use this address. Without it, sign-in is switched off in production. |
| `SMTP_URL` | **yes**, for the Q&A | SMTP server for sign-in links, e.g. `smtps://user:password@smtp.example.com:465`. |
| `SMTP_FROM` | **yes**, for the Q&A | Sender, e.g. `Setu <no-reply@setu.example>`. |
| `ADMIN_TOKEN` | **yes**, for moderation | A long random secret (at least 24 characters). Generate one with the command below. |
| `SETU_CONTACT` | recommended | A contact (email or URL) that is put into the User-Agent of the data scripts, so DAAD, HRK and OpenStreetMap can reach you. |
| `SETU_LETTER_AI` | optional | `1` turns on the AI explanation in the letter explainer (needs Ollama). Off by default. |
| `OLLAMA_URL` / `OLLAMA_MODEL` | optional | Defaults: `http://localhost:11434` and `qwen3.5:4b`. |
| `SETU_COMMUNITY_DB` | optional | Another path for the Q&A database (default `data/community.db`). |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 4. Moderation

Open `https://<your-domain>/moderate/login?key=<ADMIN_TOKEN>` once in your browser. It sets a moderator cookie for
7 days and opens `/moderate`, where held and reported posts wait. Posts with phone numbers, email addresses,
private-chat links, payment or "agent" wording, or non-official links are held automatically. Three reports hide a post
until a moderator looks at it.

Check `/moderate` at least once a day while the Q&A is open to the public.

## 5. Scheduled jobs

On Windows, `scripts/register-schedule.ps1` registers the daily task. On a Linux server use cron instead:

```cron
# Daily 09:00: watch official sources + re-verify every fact (logs in data/watch/logs)
0 9 * * *  cd /srv/setu && npm run alerts:watch --silent; npm run check:facts --silent
# Sunday 10:00: refresh DAAD data, fill in missing city guides, rebuild and restart
0 10 * * 0 cd /srv/setu && npm run data:programmes --silent -- --refresh && npm run data:map --silent && npm run data:build --silent && npm run data:cities --silent -- --max-new 20 && npm run build && systemctl restart setu
```

**Nothing is published automatically.** Changed official pages wait in `/admin`. That page only works in local
development (`npm run dev`), because it is where a person reviews AI drafts. The usual workflow is:

1. Run `npm run alerts:watch` on your own machine (where Ollama runs).
2. Review and publish in `http://localhost:3000/admin`.
3. Copy the updated `data/alerts.json` to the server. No rebuild is needed.

`check:facts` exits with code **3** when some sources only could not be reached (network trouble; try again later),
and with code **1** when a fact no longer matches its source. Read the source, correct `src/content/facts.ts`, and
deploy again before the wrong fact stays online.

## 6. Backups

Back up `data/community.db` every day. Because it uses WAL mode, use SQLite's online backup rather than copying the
file while the app runs:

```bash
mkdir -p backup
node -e "const {DatabaseSync}=require('node:sqlite');new DatabaseSync('data/community.db').exec(\"VACUUM INTO 'backup/community-$(date +%F).db'\")"
```

Everything else in `data/` can be rebuilt from the official sources.

## 7. Before going public

- [ ] Permission from DAAD and HRK to reuse their data. Drafts are in [`permission-requests.md`](permission-requests.md).
- [ ] `SETU_CONTACT` set to a real contact address.
- [ ] Privacy notice and legal notice (imprint) checked by someone who knows the rules where you operate. The EU's
      GDPR may apply because the Q&A stores the email addresses of students in Germany.
- [ ] HTTPS working. Session and moderator cookies are `Secure` in production, so sign-in fails over plain HTTP. HTTPS is
      also required to install Setu as a phone app and for offline use (the service worker only runs over HTTPS).
- [ ] On a real Android phone (Chrome) and iPhone (Safari): install from the home page card, open from the home screen, check
      the notch / home-bar spacing, then switch on flight mode and open a page you read before.
- [ ] `npm run check:facts`, `npm run test:prep`, `npm run test:letters`, `npm run test:intake`, `npm run test:sw`, `npm run test:data`, `npm run test:storage`, `npm run test:search`, `npm run lint` and `npm run build` all pass, and `npm run test:routes -- https://<your-domain>` passes against the live site.
- [ ] A test sign-in with a real university email arrives and shows the verified badge.
