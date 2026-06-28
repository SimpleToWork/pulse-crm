# PulseCRM

> Your AI-native CRM for closing more deals with less chaos.

A modern, fast, single-page CRM for small and mid-sized sales teams — contacts, companies,
a drag-and-drop deal pipeline, tasks, analytics, and a workspace-scoped Claude AI assistant.

Built the same way as **gameplan-hq**: one vanilla-HTML front end, Firebase for realtime
storage and Google sign-in, and a tiny Vercel serverless function that proxies the Claude API.
**No build step, no bundler, no framework** — easy to host, easy to hand off.

```
Browser (public/index.html)
   │  ├─ Firebase Auth (Google sign-in) ─► restricted to your Workspace domain
   │  ├─ Firestore SDK ─────────────────► contacts, companies, deals, tasks, activities, members
   │  └─ fetch("/api/claude") ──────────► Vercel function (api/claude.js) ─► Anthropic API
```

## Architecture

- **No build step.** The whole app is `public/index.html` — HTML + CSS + ES-module JS loaded
  from the Firebase CDN. No npm install to run the front end. Keep it that way.
- **The Anthropic API key never reaches the browser.** The page calls the co-located function
  at `/api/claude`, which holds `ANTHROPIC_API_KEY` server-side. That function is the single
  place CRM data meets the LLM.
- **Multi-tenant safety.** The AI prompt is scoped to the current workspace snapshot only, with
  strict privacy rules in the system prompt — it can't reference another org's data.
- **Demo mode.** Until you paste your Firebase config, the app runs on realistic in-memory
  sample data so you can explore the entire UI immediately. Writes won't persist in this mode.

## Project structure

```
pulse-crm/
├── public/index.html        ← the entire app (UI + logic)
├── api/claude.js            ← serverless Anthropic proxy (POST {prompt, system} → {text})
├── vercel.json              ← routing: /api/* → functions, everything else → index.html
├── firestore.rules.example  ← production Firestore security rules
├── .env.example             ← required env vars
├── package.json
└── README.md
```

## Setup

### 1) Firebase (storage + Google auth)

1. Create a project at <https://console.firebase.google.com>.
2. **Build → Firestore Database → Create** (start in **test mode** for development).
3. **Build → Authentication → Sign-in method → enable Google**.
4. **Project settings → General → Your apps → Web app** → copy the config object.
5. Paste it into `firebaseConfig` near the top of the `<script>` in `public/index.html`.
6. (Optional) Set `ALLOWED_DOMAIN` in the same block. It defaults to `merchantsbi.com`, so only
   `@merchantsbi.com` Google accounts can sign in. Set it to `""` to allow any Google account.

### 2) AI proxy (Claude)

- Set `ANTHROPIC_API_KEY` in **Vercel → Settings → Environment Variables** (see `.env.example`).
  Get a key from <https://console.anthropic.com> → API Keys.
- `api/claude.js` uses `claude-sonnet-4-6`. The AI assistant, contact/deal summaries,
  next-best-action, and email drafts all route through it.
- Add your production domain to `ALLOWED_ORIGINS` in `api/claude.js` once deployed.

### 3) Host (Vercel)

```bash
npm i -g vercel   # if needed
vercel            # from the repo root; link to the SimpleToWorkMain project
vercel --prod
```

`vercel.json` rewrites all non-`/api` paths to `index.html`, so it's a single-page app with
co-located serverless functions.

### 4) Lock down Firestore before launch

Replace test-mode rules with `firestore.rules.example` (Firebase console → Firestore → Rules).
Those rules allow access only to signed-in, email-verified users on your Workspace domain, and
only to the app's collections.

## Features

- **Dashboard** — open pipeline, weighted forecast, win rate, contacts, tasks due, stage
  breakdown, live activity feed, and a one-click AI weekly summary.
- **Contacts** — searchable/filterable table, full profiles with activity timeline, related
  deals, AI summary + next-best-action + follow-up email draft.
- **Companies** — profiles with linked contacts, deals, and open-pipeline rollups.
- **Pipeline** — drag-and-drop kanban across 7 stages with per-stage value totals; per-deal AI
  risk score and suggested next step.
- **Tasks** — Today / Overdue / Open / Completed views, priorities, and record links.
- **Analytics** — revenue by month, win rate, avg deal size, top lead sources, rep performance.
- **PulseAI assistant** — global slide-over chat scoped to your workspace data.
- **Command palette** — ⌘K / Ctrl+K to search and jump anywhere.
- **Polish** — light/dark mode, empty states, toasts, soft-delete, responsive layout.

## Data model (Firestore collections)

`contacts`, `companies`, `deals`, `tasks`, `activities`, `members`. Every record carries
`createdAt`, `updatedAt`, `createdBy`, and `deletedAt` (soft delete — records are hidden, not
destroyed). Relationships: a company has many contacts and deals; a contact has many deals;
tasks, notes, and activities attach to a contact, company, or deal.

## Roadmap (deferred to later phases)

Visual automation builder, calendar/email sync (Gmail/Outlook/Google Calendar), Stripe billing,
file attachments, deeper analytics, and the integration placeholders shown in Settings. The data
model and app shell are structured so these slot in without a rewrite.

