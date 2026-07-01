# PulseCRM — Next.js app (migration)

The full CRM rebuilt on **Next.js (App Router) + React + TypeScript**, migrating off the
single-file `public/index.html`. Grows to parity on `feature/next-migration` while the
live app stays untouched; production cutover is the final, deliberate step.

## Run it

```bash
cd next-poc
npm install      # already done in this environment
npm run dev      # → http://localhost:3100
```

Boots in **demo mode** on generated sample data (500 contacts, 30 companies, 120 deals,
tasks, tickets, templates), zero config. To connect real services, add `next-poc/.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pulse-crm-60582
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
ANTHROPIC_API_KEY=...        # server-side, for the AI assistant (/api/claude)
```

With Firebase set, auth uses Google sign-in (restricted to `@merchantsbi.com`) and data
streams live via `onSnapshot`. Without it, demo mode. Without `ANTHROPIC_API_KEY` the AI
assistant returns a graceful "not configured" message.

## What's built

- **Shell** — routed sidebar + topbar, light/dark theme, auth gate (Firebase or demo).
- **Views** — Dashboard, Contacts, Companies, Deals (list + drag-and-drop kanban), Tasks,
  Support Tickets, Templates, Analytics, Settings, Quote Builder (live pricing engine).
- **Tables** — reusable `<DataTable>` with Excel-style column filters (checklist + text/
  number/date conditions, lazy + capped), sort, and pagination.
- **Write paths** — create/edit/delete via a drawer + generic `EntityForm` for every entity;
  soft-delete; toasts; board drag and task-toggle persist through the CRUD layer.
- **AI assistant** — floating PulseAI panel using a workspace-scoped context + privacy
  system prompt, proxied through `/api/claude` (Anthropic key stays server-side).

Not yet migrated: **Support Settings** (SLA rules/categories admin) is a stub; the Quote
Builder ports the pricing engine but its advanced settings (AI cost modeling, integration
pricing CRUD) and saving quotes will come with a later pass.

## Layout

```
app/                 root layout + Providers; (app)/ group = shell + routes; api/claude route
components/          Sidebar, Topbar, DataTable, FilterDropdown, Pager, Drawer, Toasts,
                     AiAssistant, charts; forms/EntityForm; views/*
lib/                 store (Zustand) · db (CRUD) · xf (filter engine) · quote (pricing) ·
                     ai · firebase · demoData · format · types · icons
```

## Deployment

Deploy as its **own** Vercel project with Root Directory `next-poc` (Next.js auto-detected);
the live `index.html` project is unaffected. Final cutover repoints production at this app.
See the migration plan for details.
