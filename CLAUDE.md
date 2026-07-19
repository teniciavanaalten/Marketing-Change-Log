# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Melon** is a marketing master dashboard. Today it is a campaign change log + performance chart; the direction is a single dashboard that pulls data from marketing APIs (LinkedIn Ads, Google Ads, Google Analytics) so the owner can spot correlations between marketing actions (e.g., a LinkedIn campaign going live) and signals elsewhere (e.g., branded search spikes) — all sources on one timeline instead of scattered across tools.

Deliberate product decisions:
- **No AI/LLM layer.** The owner judges the data themselves. Don't add AI-driven analysis or narration. (The old README mentioned a Gemini key — that was unused AI Studio scaffolding, since removed.)
- The core value is the **overlay**: change-log events rendered as markers on metric time series (`components/Dashboard/AnalyticsChart.tsx`).

The owner is a non-developer ("vibe coder") working in Dutch. Explain changes in plain language, keep steps small, and never assume a human will review the code after you.

## Commands

```bash
npm install       # once
npm run dev       # Vite dev server
npm run build     # tsc && vite build (build doubles as the type check — there are no tests or linter)
npm run preview
```

## Architecture

Vite + React 18 + TypeScript SPA. No backend, no router — `App.tsx` is the single screen.

Data flow:
- `types.ts` — the whole data model. The two core entities share `date: 'YYYY-MM-DD'` keys: `ChangeLog` (a marketing action, with platform/campaign/changeType/tags) and `DailyMetric` (a daily time-series row, with fixed ad metrics plus a `customMetrics: Record<string, number>` bag for anything else).
- `services/dataService.ts` — **the persistence seam, currently an in-memory mock** (`let mockDb`, fake latency). Every read/write goes through it, so real storage (localStorage or an API backend) slots in here without touching components. Until then, all data is lost on refresh.
- `context/AppContext.tsx` — global config state: platforms, campaigns, metric definitions, change types, theme, date range. Per-view data (metrics/logs/imports) is local state in `App.tsx`, fetched via `dataService`.
- Metrics enter via `components/Dashboard/CsvUploader.tsx` (hand-rolled CSV parsing with fuzzy header matching) — the ingestion point that platform API connectors will eventually replace/augment.
- Platforms, metrics, and change types are all user-configurable at runtime (the various `*ManagerModal` components); metric identity is string-key based.

## Landmines

- `index.html` contains an esm.sh **import map with different major versions** (React 19, recharts 3) than `package.json` (React 18, recharts 2). Vite ignores the import map, so `node_modules` versions are what actually run — but don't consult the import map for version info, and removing it is planned.
- Tailwind is loaded via CDN `<script>` in `index.html`, not as a build dependency — there is no tailwind.config file to edit; theme tweaks live in the inline config in `index.html`.
- The CSV parser splits on raw commas (breaks on quoted fields) and maps `'avg. cpc'` to the spend column — be careful trusting imported spend data.
- Chart event markers join change logs to metrics on exact date equality only, so events without a same-day metric row are invisible, and weekly/monthly granularity drops markers.
