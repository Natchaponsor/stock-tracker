# Stock Tracker

A weekly-cadence swing-trading journal: a small watchlist with live EMA signal state,
open positions with real-time unrealized P&L, and a position journal — a sibling to
a separate day-trading journal, built for a different rhythm (a handful of positions
held for weeks, not dozens of same-day trades).

- **Almost entirely client-side.** Positions, strategies, and your watchlist are seeded
  on first load and persisted only in `localStorage`. No login, no accounts.
- **Two server touchpoints**, both stateless proxies that relay public market data and
  never see or store your positions:
  - `app/api/quote/route.ts` — current price + day change
  - `app/api/history/route.ts` — ~2 years of daily closes, used to compute the 50/200-day
    EMA and detect golden/death crosses client-side
- **Dark theme** (near-black background, blue accent), fully responsive.

## Data model

- **Position** — a symbol with `entries`/`exits` (`Fill[]`, so scaling in or out over
  weeks is native) and a `notes` timeline (periodic check-ins, not a one-time reflection).
  Can be `"open"` or `"closed"`.
- **Strategy** — a named rule set (entry rule / exit rule) a position is tagged with;
  the Strategies page tracks win rate and average return per strategy.
- **Signal** — computed, not stored: EMA50/EMA200 crossovers read from real daily history.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS v4, Recharts, Zustand (`persist`), SWR,
Framer Motion, date-fns, Vitest.

## Getting started

```bash
npm install
npm run dev      # dev server on :3001
npm run test      # unit tests for indicators, position metrics, and the data core
npm run build     # production build
```

Open [http://localhost:3001](http://localhost:3001). Data seeds itself on first load —
use "Reset demo" in the top bar to regenerate it.

## Deploy

Requires a Node/Edge runtime for the two price-proxy routes, so it deploys to
**Vercel**, not a static export.
