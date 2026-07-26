# Stock Tracker

A weekly-cadence swing-trading journal — a small watchlist, open positions with
real-time unrealized P&L, and a position journal. Built as a sibling to a separate
day-trading journal, for a different rhythm (a handful of positions held for weeks,
not dozens of same-day trades).

- **Almost entirely client-side.** Positions, strategies, cash balance, and your
  watchlist are seeded on first load and persisted only in `localStorage`. No login,
  no accounts.
- **One server touchpoint** — `app/api/quote/route.ts`, a stateless proxy to
  [Finnhub](https://finnhub.io) that relays a public current price + day change and
  never sees or stores your positions.
- **Manual price refresh, not background polling.** Nothing fetches on a timer —
  prices are fetched once on page load and again only when you click "Refresh
  Current Price," to keep API call volume low and predictable.
- **Light/dark theme**, toggled from the top bar and remembered across visits, fully responsive.

## What works right now

- **Dashboard** — cash balance (editable), mark-to-market positions value, total
  portfolio value; a horizontal bar chart of portfolio allocation (cash + each
  symbol); a watchlist strip; open positions; closed positions; per-strategy
  win-rate/avg-return.
- **Positions** — log a position with an initial fill, scale in/out with more fills
  at any time, close it, edit its thesis/strategy/stop/target, delete it.
- **Journal** — periodic check-in notes on a position (not just a one-time closing
  reflection), each snapshotting the price at the time.
- **Strategies** — define named rule sets (entry rule / exit rule) and see how each
  is actually performing across the positions tagged to it.
- **Data menu** — Export (download everything as JSON), Import (restore from a
  previously exported file, with a preview of what it contains), Reset to demo data,
  Erase all data — every option behind its own confirmation dialog. Erasing stays
  erased across reloads; it won't silently reseed the demo dataset.
- **Live prices** — current price + day change per symbol via Finnhub, fetched
  on load and on manual refresh only.

## Coming Soon

- **Price charts & EMA signals.** Finnhub's free tier covers live quotes but not
  historical daily bars (`/stock/candle` requires a paid plan) — so the 50/200-day
  EMA, golden/death-cross signals, and the price-history chart on each position are
  paused with a placeholder until a free/low-friction historical-data source is
  wired in (candidate: Twelve Data's free tier, which does include daily time
  series). The underlying math (`lib/indicators.ts`, EMA/MACD/cross-detection, unit
  tested) and the `/api/history` route are already built and just waiting on a
  working data source — see `app/quote-lab` on the `test/quote-fetch-lab` branch for
  the manual-fetch harness used to evaluate providers without burning through rate limits.

## Potential future features

- A working historical-data provider → revive price charts, EMA signals, and the
  MAE/MFE-style "how much heat did I take" view the day-trading journal has.
- Multiple accounts/portfolios, if one cash balance stops being enough.
- Alerts (e.g. "notify me if a watchlist symbol crosses its 200-day") once a
  provider with real history is in place.
- CSV export of positions (mirroring the day-trading journal's trade-log export),
  in addition to the existing full-JSON export.

## Data model

- **Position** — a symbol with `entries`/`exits` (`Fill[]`, so scaling in or out over
  weeks is native) and a `notes` timeline (periodic check-ins, not a one-time reflection).
  Can be `"open"` or `"closed"`.
- **Strategy** — a named rule set (entry rule / exit rule) a position is tagged with;
  the Strategies page tracks win rate and average return per strategy.
- **Cash** — a starting balance you set, netted automatically against every fill
  across every position; shown as its own slice in the portfolio allocation chart.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS v4, Recharts, Zustand (`persist`), SWR,
Framer Motion, date-fns, Vitest.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in FINNHUB_API_KEY — free at finnhub.io/register
npm run dev      # dev server on :3001
npm run test      # unit tests for indicators, position metrics, and the data core
npm run build     # production build
```

Open [http://localhost:3001](http://localhost:3001). Data seeds itself on first load —
use the Data menu's "Reset to demo data" to regenerate it. Without `FINNHUB_API_KEY`
set, the app still runs — prices just show "unavailable" instead of crashing (the
quote proxy fails soft on a missing key, same as any other upstream error).

## Deploy

Requires a Node/Edge runtime for the price-proxy route, so it deploys to
**Vercel**, not a static export. Add `FINNHUB_API_KEY` as an environment variable in
the Vercel project settings — it's read server-side only and never reaches the client.
