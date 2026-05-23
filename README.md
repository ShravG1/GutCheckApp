# GutCheck

A calm, private food & symptom diary. GutCheck helps people with recurring
stomach trouble work out what their gut reacts to — by prompting gentle
check-ins **hours after** a meal, since food reactions are often delayed.

## Features

- **Fast meal logging** — meal type, free-text food with autocomplete, tags, photo, notes
- **Delayed check-ins** — automatic prompts at configurable intervals (default 1h, 4h, 12h, 24h)
- **Pattern detection** — surfaces things like "bloating followed dairy 8 of 10 times"
- **Insights** — charts for common symptoms, trends over time, time-of-day, quiet days
- **History** — searchable, day-grouped timeline of meals and check-ins
- **Export** — tidy PDF and CSV summaries to take to a doctor's appointment
- **Reminders** — optional breakfast / lunch / dinner nudges
- **Installable PWA** — works offline, calm light UI

## Privacy

Everything is stored locally on the device using IndexedDB (via Dexie).
No accounts, no cloud, no analytics, no external scripts. Health data
stays with the person it belongs to.

## Tech

React + Vite (PWA) · Tailwind CSS · Dexie/IndexedDB · date-fns · Recharts · jsPDF

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Icons

```bash
npm run icons   # regenerates PWA icons from the SVG in scripts/generate-icons.mjs
```
