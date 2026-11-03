# Stock Tracker

A weekly-cadence swing-trading journal — a small watchlist, outstanding shares with
real-time unrealized P&L, and a position journal. Built as a sibling to a separate
day-trading journal, for a different rhythm (a handful of positions held for weeks,
not dozens of same-day trades).

- **Almost entirely client-side.** Positions, strategies, cash balance, and your
  watchlist are seeded on first load and persisted only in `localStorage`. No login,
  no accounts.
- **Two server touchpoints, both stateless proxies to [Finnhub](https://finnhub.io)** —
  `app/api/quote/route.ts` relays a public current price + day change, and
  `app/api/logo/route.ts` serves each company's logo (looked up about once a month and
  cached), so your browser never talks to Finnhub directly. Neither sees or stores
  your positions; a symbol with no logo falls back to its lettered sector circle.
- **Manual price refresh, not background polling.** Nothing fetches on a timer —
  prices are fetched once on page load and again only when you click "Refresh
  prices," to keep API call volume low and predictable.
- **Light theme by default, dark on request.** The toggle is remembered across
  visits. On phones a bottom tab bar (with a raised Log button) replaces the top
  menu.

## What works right now

- **Dashboard** opens on the **Portfolio summary** header: the total, with cash
  (editable), positions value and change from starting capital beneath it, a
  "Prices as of 10:17 AM · 1 min ago" chip, and a privacy toggle that hides every
  amount. Below it, as cards:
  - **Portfolio P&L**: realized vs. unrealized, with a per-stock breakdown open by
    default. The "% Portfolio" column appears only when the card is wide enough;
    narrower cards show a share bar instead.
  - **Allocation by sector**: cash plus one bar per sector. "Assign new sector"
    lets you create your own named sector, pick one of the six sector colours,
    and move symbols into it. Your sectors override the built-in table.
  - **Watchlist**: up to 15 symbols, each with its company logo ringed in its
    sector colour, the latest price and its age. Reorder by dragging the grip (or
    ↑/↓ on the grip). When it's full, a note tells you to remove one first.
  - **Recorded log**: every buy and sell, newest first. Buys show entry price,
    date and unrealized P&L; sells show selling price, date and realized P&L.
  - **Strategy performance**: per-strategy win rate and average return
    (collapsed by default).
- **Positions** — Buy shares (a new symbol, or adding to one you already hold) and
  Sell shares (FIFO across whatever open lots exist for that symbol, auto-closing
  a lot it fully depletes); scale in/out any time from a position's own page; edit
  its Strategy Notes/thesis/stop/target; delete it.
- **Journal** — periodic check-in notes on a position (not just a one-time closing
  reflection), each snapshotting the price at the time.
- **Strategies** — define named rule sets (entry rule / exit rule) and see how each
  is actually performing across the positions tagged to it.
- **Data menu**: Export (download everything as JSON, format v2, which includes
  watchlist order and custom sectors), Import (restore from a previously exported
  file, with a preview of what it contains; v1 files still import), Reset to demo
  data, and Erase all data. Every option sits behind its own confirmation dialog.
  Erasing stays erased across reloads; it won't silently reseed the demo dataset.
- **Company logos**: fetched through the app's own `/api/logo` route and cached
  for about a month. A symbol with no logo (or a non-US listing) falls back to
  its first letter on the sector colour.
- **Live prices** — current price + day change per symbol via Finnhub, fetched
  on load and on manual refresh only, labeled with how stale the quote actually is
  (Finnhub's free tier doesn't update outside regular US market hours).
- **Analysis tab** — pick an action (Technical/Fundamental/Stock Performance, Market
  Performance, Sector Rotation), a stock, and a market (Korea, Thailand, Japan, or US:
  NYSE, NASDAQ, NYSE American, S&P 500), and it builds a ready-to-run
  `/stock-analysis` prompt and copies it to your clipboard — an MVP prompt generator
  for the `stock-analysis` Claude Skill, not a live in-app integration yet.
- **Disclosures tab** — a curated log of officials' OGE 278-T/278e filings (trades,
  whole-report totals, annual holdings) read from `data/disclosures.json`, with
  reporting bands shown as bands and a band flagging any symbol you hold or watch.
  The `disclosure-collector` Claude Code agent (`.claude/agents/`) keeps it current;
  `npm run disclosures:signals [-- --book export.json]` derives
  `data/disclosure-signals.json`, the per-symbol packets a decision agent reads.

## Coming Soon

- **Signals — Trend (EMA), RSI, MACD, Volume, and P/E.** Every position page has a
  Signals panel wired to real, unit-tested logic (`lib/indicators.ts`, `lib/signal.ts`)
  that currently has no data to read, so each row shows "Coming Soon!" until a
  provider is connected:
  - **Trend (50/200 EMA cross), RSI (14), MACD (12/26/9), Volume** all come from
    the *same* historical daily-bar fetch (`/api/history`) — one API call per
    symbol lights up all four. Finnhub's free tier covers live quotes but not
    historical candles (`/stock/candle` needs a paid plan), so this is blocked on
    picking a historical-data provider (candidate: Twelve Data's free tier, which
    does include daily time series). See `app/quote-lab` on the
    `test/quote-fetch-lab` branch for the manual-fetch harness used to evaluate
    providers without burning through rate limits.
  - **P/E ratio** is fundamental/company data, not a price quote or candle — a
    different data category, so it needs its own endpoint (`/api/fundamentals`,
    already scaffolded) and likely its own provider, since not every quote/candle
    API also carries fundamentals on a free tier.

## Potential future features

- A working historical-data provider → revive price charts, the Trend/RSI/MACD/Volume
  signals, and the MAE/MFE-style "how much heat did I take" view the day-trading
  journal has.
- A fundamentals provider → light up the P/E ratio signal.
- Multiple accounts/portfolios, if one cash balance stops being enough.
- Alerts (e.g. "notify me if a watchlist symbol crosses its 200-day") once a
  provider with real history is in place.
- CSV export of positions (mirroring the day-trading journal's trade-log export),
  in addition to the existing full-JSON export.
- **Multiple brokerages/accounts per symbol.** Selling currently assumes every share
  of a symbol is one fungible pool and applies FIFO automatically across whatever
  open lots exist for it — there's no way yet to tag a lot by broker/account or
  choose which one a sell comes from. Not supported today; would need fills to carry
  an account tag and the Sell flow to let you pick one instead of always FIFO-ing.

## Data model

- **Position** — a symbol with `entries`/`exits` (`Fill[]`, so scaling in or out over
  weeks is native) and a `notes` timeline (periodic check-ins, not a one-time reflection).
  Can be `"open"` or `"closed"`.
- **Strategy Notes** — a position's `strategyIds` (zero or more named Strategy
  records) plus `customTags` (free-text notes with no formal rule set yet). Both
  render as tags on each buy in the Recorded log and on the position page.
- **Strategy** — a named rule set (entry rule / exit rule) a position can be tagged
  with; the Strategies page tracks win rate and average return per strategy.
- **Cash** — a starting balance you set, netted automatically against every fill
  across every position; shown as its own slice in the portfolio allocation chart.

## Design system: Navy Stream

The UI is built on **Navy Stream**, a vendored design system. Its values are
copied into the repo and used as they come; this app adds no colours, radii or
type sizes of its own. [DESIGN.md](DESIGN.md) is the full reference (tokens,
components, layout, measured contrast); this is the short version of how it's
wired and the rules for using it.

### Where things live

| Layer | File | Role |
|---|---|---|
| Tokens | `styles/navy-stream/tokens.css` | Every colour, spacing, radius, shadow and type value as a CSS variable. Light on `:root`, dark on `:root[data-theme="dark"]`. |
| Components | `styles/navy-stream/bundle.css` | The system's ready-made `oc-*` classes: `oc-silk` (hero gradient), `oc-card`, `oc-btn-*`, `oc-badge-*`, `oc-track`, `oc-tabbar`, `oc-num` (tabular figures)… |
| Tailwind bridge | `app/globals.css` | Exposes the tokens as `ns-*` utilities (`bg-ns-card`, `text-ns-ink-muted`, `rounded-ns-lg`, `shadow-ns-card`) and the type classes `ns-amount-xl` … `ns-caption`. |
| Primitives | `components/navy/primitives.tsx`, `components/ui/` | `NsCard`, `NsPnl`, `NsChangeBadge`, `SymbolMark`, `NsEmpty`, `NsSkeleton`; `Button`, `Segmented`, `ConfirmDialog`, … |
| Shell | `components/navy/NavyShell.tsx` | Top menu from `md` up, bottom tab bar + Log FAB on phones. |
| Sectors | `lib/sectors.ts` | Maps sectors to the system's `cat-*` colours and resolves each symbol's sector. |

### Rules of use

How to decide what to reach for when building a screen, in order:

1. **Use a primitive if one fits.** A section is an `NsCard`; a signed amount is
   `NsPnl` or `NsChangeBadge`; a ticker's icon is `SymbolMark`; a destructive
   confirm is `ConfirmDialog`.
2. **Otherwise use an `oc-*` class** if the system already has that component
   (hero, glass chip, badge, progress track, tab bar).
3. **Otherwise compose `ns-*` utilities.** Use `var(--token)` in inline styles
   only when the value is dynamic (a sector colour, a bar width).
4. **Never write a raw colour** (`#hex`, `rgb()`, `text-blue-600`) in a
   component or stylesheet. If a value is genuinely missing, add a token to
   `tokens.css` with a dark value and bridge it in `globals.css`. Don't patch it
   locally.

The fixed meanings behind those choices:

- **Direction:** gains are `success` (green), losses `danger` (red), flat is
  muted. Each one also carries a ▲/▼ glyph and a sign, so colour never works
  alone. Green and red are never used for emphasis.
- **Blue:** `primary` is for fills (buttons, focus ring); `primary-text` is for
  blue text (links, the active tab), and it brightens in dark mode to stay
  readable.
- **Hero tokens** (`hero-*`, glass, `on-hero-muted`) appear only inside the
  silk Portfolio summary header.
- **Sectors** take their colour only from `lib/sectors.ts`, which reuses the
  six `cat-*` tokens. User-made sectors choose from the same six.
- **Figures** always carry `oc-num`, so columns align on the digit.
- **Width inside cards** responds to the card, not the screen: tables use
  container queries (`@container` / `@lg:`), because a card in the two-column
  grid is narrow even on a wide monitor.
- **Light is the default theme.** Design there first, then check dark.

Two cascade gotchas:

- `bundle.css` is unlayered, so `oc-*` rules beat Tailwind. Override one with
  Tailwind's `!` suffix (`px-1!`) instead of editing the vendored file.
- Tailwind's own `rounded-sm…xl` keep their stock sizes. Navy surfaces use
  `rounded-ns-*`.

## Stack

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript, Tailwind CSS v4,
Navy Stream (vendored CSS tokens/components), Inter via `next/font`, Recharts,
Zustand (`persist`), SWR, Framer Motion, lucide-react, date-fns, Vitest.

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

Requires a Node/Edge runtime for the two proxy routes (`/api/quote`, `/api/logo`),
so it deploys to **Vercel**, not a static export. Live at
<https://stock-tracker-phi-lyart.vercel.app/>, deployed from `main`. Add `FINNHUB_API_KEY` as an environment variable in
the Vercel project settings — it's read server-side only and never reaches the client.

## License

[MIT](LICENSE)
