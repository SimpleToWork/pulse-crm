# PulseCRM — Next.js Proof of Concept

A one-view port of the Contacts screen (Excel-style column filters + pagination)
to **Next.js (App Router) + React + TypeScript**, to evaluate migrating the CRM
off the single `public/index.html` file.

This lives beside the real app and does **not** touch it or its Vercel deploy.

## Run it

```bash
cd next-poc
npm install      # already done in this environment
npm run dev      # http://localhost:3100
```

It boots in **demo mode** on 500 generated sample contacts, so it runs with zero
config. To point it at real Firestore, create `next-poc/.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pulse-crm-60582
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# (storageBucket / senderId / appId optional for read-only Firestore)
```

`useContacts()` streams `contacts` + `companies` via `onSnapshot` when configured,
and falls back to demo data otherwise.

## What it demonstrates (vs the single-file app)

| Concern | Single-file `index.html` | This POC |
|---|---|---|
| Reactivity | Manual `render()` (55 call sites); a Firestore burst re-rendered the whole UI ~29× | React state → only changed rows re-render. No manual render, no flicker by construction |
| Structure | One 5,300-line file | `app/`, `components/`, `lib/` — one concern per file |
| XSS | Hand-built HTML strings guarded by `esc()` | JSX auto-escapes |
| Types | None | TypeScript across data, filters, columns |
| Filter engine | `xf*` functions inline in the big file | `lib/xf.ts` — pure, typed, unit-testable |

Same UX as production: value checklist + condition filters (text/number/date),
lazy-built and capped at 300 for high-cardinality columns, multi-column AND,
click-to-sort, and 50/page pagination with a page-size selector.

## Layout

```
app/            layout.tsx, page.tsx, globals.css (ported design tokens)
components/     ContactsPage · FilterDropdown · Pager
lib/            xf.ts (filter engine) · types.ts · useContacts.ts · firebase.ts · demoData.ts · format.ts
```

## What a full migration would still need (not in this POC)

Auth + domain gating, the other views (Companies/Deals/Tasks/Tickets/Analytics/
Settings/Quote Builder), write paths (forms, drawers, soft-delete), the `/api/*`
functions as route handlers, the AI assistant, and tests. This POC is scoped to
prove the model and feel on one representative, filter-heavy view.
