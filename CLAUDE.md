# CLAUDE.md — GutCheck

A calm, private food & symptom diary PWA that prompts gentle check-ins *hours
after* a meal to spot delayed gut reactions. Global prefs live in
`~/.claude/CLAUDE.md`; this is the per-repo guide (CONTRACT §4).

## Stack
- Vite + React + Tailwind CSS, installable **PWA** (`vite-plugin-pwa`).
- **Local-first storage via Dexie (IndexedDB)** — data lives in the browser; there
  is no backend or server.
- Charts: `recharts`. PDF export: `jspdf`. Dates: `date-fns`.

## Run
```bash
npm install
npm run dev        # Vite — http://localhost:5173
npm run build      # production build
npm run lint       # eslint
npm run icons      # regenerate PWA icons (scripts/generate-icons.mjs)
```

## Gotchas
- All data is **local to the browser** (Dexie/IndexedDB). Clearing site data wipes
  it; there's no sync or recovery. Treat it as private health data.
- It's a PWA — test installed/offline behaviour, not just desktop Chrome.

## Guardrails (CONTRACT.md)
Private by default · no auto-merge · no force-push without asking · nothing
destructive without confirmation.
