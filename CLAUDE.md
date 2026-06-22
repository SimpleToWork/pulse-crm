# CLAUDE.md

Guidance for working in this repo. Read this before making changes.

## What this is

PulseCRM — an AI-native CRM for small sales teams (contacts, companies, a drag-and-drop
deal pipeline, tasks, analytics, and a workspace-scoped Claude assistant).

**Core principle: NO BUILD STEP.** The entire front end is one file, `public/index.html`
(HTML + CSS + ES-module JS), loading the Firebase SDK from a CDN. There is no bundler, no
framework, no `npm install` to run the app. Keep it that way unless explicitly asked to
change it — a build step is a significant architectural decision, not a convenience.

## Architecture

```
Browser (public/index.html)
   ├─ Firebase Auth (Google sign-in) ──► restricted to ALLOWED_DOMAIN
   ├─ Firestore SDK (onSnapshot) ───────► realtime: contacts, companies, deals, tasks, activities, members
   └─ fetch("/api/claude") ─────────────► Vercel fn (api/claude.js) ──► Anthropic API
```

- **The Anthropic key never reaches the browser.** `api/claude.js` is the only place CRM
  data meets the LLM. It holds `ANTHROPIC_API_KEY` server-side and proxies `POST {prompt, system} → {text}`.
- **Demo mode.** If `firebaseConfig.apiKey` still starts with `PASTE`, `fbReady` stays false
  and the app runs on in-memory seed data (writes don't persist). This is the fallback path —
  every store helper has a demo branch; keep both branches working.

## Files

| File | Purpose |
|------|---------|
| `public/index.html` | The entire app — UI, state, store, AI, Firestore wiring, demo seed (~1160 lines) |
| `api/claude.js` | Serverless Anthropic proxy. CORS allowlist, key guard, model call |
| `vercel.json` | Routing: `/api/*` → functions, everything else → `index.html` (SPA) |
| `firestore.rules.example` | Production Firestore rules — paste into Firebase console |
| `.env.example` | `ANTHROPIC_API_KEY` (server-side only) |

## How `index.html` is organized (top → bottom)

1. **CSS** — design tokens as CSS vars, light/dark theme, all component styles.
2. **CONFIG block** (~line 315) — `firebaseConfig`, `AI_ENDPOINT`, `ALLOWED_DOMAIN`. The
   "fill these in" section.
3. **Constants** — `STAGES`, `STAGE_COLOR`, `STAGE_PROB` (pipeline probabilities), `STATUS_COLOR`,
   `PRIORITIES`, icon set `I`.
4. **`state`** — single global object: `{page, detail, user, contacts[], companies[], deals[],
   tasks[], activities[], members[], theme, aiOpen, aiLog[], ...}`.
5. **Utility helpers** — `esc()` (HTML escape — **always use for user data**), `money`/`moneyK`,
   `initials`/`ava`/`colorFor`, `fmtDate`/`timeAgo`, `live()` (filters soft-deleted), id lookups.
6. **Store** (`dbAdd`/`dbUpdate`/`dbRemove`) — the ONLY way to mutate data. Each has a Firestore
   branch and a demo branch. `dbRemove` is a **soft delete** (sets `deletedAt`, never destroys).
7. **AI** — `workspaceContext()`, `AI_SYSTEM`, `askAI()`.
8. **`render()` + `renderX()`** — one render function per view (Dashboard, Contacts, Companies,
   Deals, Tasks, Analytics, Settings) plus detail views. Re-renders from `state` on every change.
9. **Forms/drawers** — `openDrawer`, `field`, and per-entity `contactForm`/`dealForm`/etc.
10. **Firestore wiring / demo seed** — `subscribe()` opens an `onSnapshot` per collection;
    `onAuthStateChanged` gates on `ALLOWED_DOMAIN`.

## Conventions (match these)

- **Render model:** mutate `state` → call `render()`. No virtual DOM, no reactivity — explicit
  re-render. Firestore `onSnapshot` calls `render()` automatically on remote changes.
- **All persistence goes through `dbAdd`/`dbUpdate`/`dbRemove`.** Never call Firestore SDK
  directly from a view. New collections must be added to BOTH `subscribe()` and the Firestore
  rules `collection in [...]` list.
- **Escape all user-supplied strings** with `esc()` when building HTML (this app builds HTML via
  template strings — XSS risk is real).
- **Audit fields** are added automatically by the store: `createdAt`, `updatedAt`, `createdBy`,
  `deletedAt`. Don't set them by hand.
- **Money** is stored as a raw number; format only at display time with `money()`/`moneyK()`.
- Coding style is terse/dense (minified-ish). Match the surrounding density; don't reformat
  unrelated code.

## AI integration

- `askAI(userPrompt, extraContext)` prepends `workspaceContext()` (a scoped snapshot of the
  current workspace) and posts to `/api/claude` with the `AI_SYSTEM` privacy prompt.
- **Privacy is load-bearing:** `AI_SYSTEM` forbids using anything outside the provided snapshot,
  and `workspaceContext()` only includes the signed-in user's workspace data. Preserve this when
  changing prompts — never widen the snapshot beyond the current workspace.
- **AI output is rendered as plain text** (newlines → `<br>`). The system prompt asks for no
  markdown headers. If you change that, update the rendering accordingly.
- Model lives in `api/claude.js` (`claude-sonnet-4-6`). Before changing model/params, consult the
  `claude-api` skill — don't guess model IDs.

## Deployment (Vercel)

- Scope `merchantsbi`, project `pulse-crm`. **Live: https://pulse-crm-blush.vercel.app**
  (the bare `pulse-crm.vercel.app` was taken, hence `-blush`).
- **Push-to-deploy is connected** (GitHub `SimpleToWorkMain/pulse-crm`): pushing to `master`
  auto-deploys to production; branches/PRs get preview URLs. Manual deploy: `vercel --prod`.
- `ANTHROPIC_API_KEY` is set in Vercel project env (Production). The function returns 503 if missing.
- **Two values must track the live domain:** `ALLOWED_ORIGINS` in `api/claude.js` and the
  Firebase Auth → Authorized domains list. If the domain changes, update both.
- Firebase project: `pulse-crm-60582`. Sign-in restricted to `@merchantsbi.com` via `ALLOWED_DOMAIN`.
- The Firebase web `apiKey` is a public client identifier — safe to commit. The real protection
  is Firestore rules + the auth domain allowlist.

## Gotchas

- Editing `firebaseConfig` back to `PASTE...` silently drops the app into demo mode.
- New Firestore collections need three edits: `subscribe()`, the rules allowlist, and any
  `state` initialization.
- Firestore is in **Production mode** — it denies everything until the rules from
  `firestore.rules.example` are published in the console.
