# CLAUDE.md — GutCheck

A calm, private food & symptom diary PWA that prompts gentle check-ins *hours
after* a meal to spot delayed gut reactions. Global prefs live in
`~/.claude/CLAUDE.md`; this is the per-repo guide (CONTRACT §4).

## Stack
- Vite + React + Tailwind CSS, installable **PWA** (`vite-plugin-pwa`).
- **Local-first data via Dexie (IndexedDB)** — all *data* lives in the browser;
  there is no data backend, no sync, no server-side store.
- But the app itself **deploys to Cloudflare Workers** (`wrangler.jsonc`,
  `@cloudflare/vite-plugin` in `vite.config.js`) as an SPA. "No data backend"
  is not "no deploy target" — don't assume plain static Vite.
- Local reminders via a small **notifications / service-worker** layer
  (`src/lib/notifications.js`, `public/sw-notifications.js`) — see Gotchas.
- Charts: `recharts`. PDF export: `jspdf`. Dates: `date-fns`.

## Run
```bash
npm install
npm run dev        # Vite — http://localhost:5173
npm run build      # production build
npm run preview    # build + `wrangler dev` (runs the Worker — NOT vite preview)
npm run deploy     # build + `wrangler deploy` (Cloudflare — /ship only)
npm run lint       # eslint
npm run icons      # regenerate PWA icons (scripts/generate-icons.mjs)
```

## Gotchas
- All data is **local to the browser** (Dexie/IndexedDB). Clearing site data wipes
  it; there's no sync or recovery. Treat it as private health data.
- It's a PWA — test installed/offline behaviour, not just desktop Chrome.
- **`npm run preview` builds first and runs `wrangler dev`**, not `vite preview` —
  it boots the real Worker, so it needs a fresh build.
- **Notifications fire only while the app is open** — they're `setTimeout`-based
  with no push server (by design). Closed-app check-ins surface as "pending" cards
  on next open. Timers are capped to a **24h horizon**, and they need notification
  permission + HTTPS — so they won't fire in plain `npm run dev` without the PWA SW.

## Guardrails (CONTRACT.md)
Private by default · no auto-merge · no force-push without asking · nothing
destructive without confirmation.
