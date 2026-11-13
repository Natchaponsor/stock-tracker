# Stock Tracker

A weekly-cadence swing-trading journal — a small watchlist, outstanding shares with
real-time unrealized P&L, and a position journal. Built as a sibling to a separate
day-trading journal, for a different rhythm (a handful of positions held for weeks,
not dozens of same-day trades).

- **Your data stays on your device.** Positions, strategies, cash balance, custom
  sectors and your watchlist live in the browser's `localStorage` on each device.
  Nothing about your book is ever stored anywhere in readable form. No login, no
  accounts, and the app keeps working offline.
- **Pair as many devices as you like.** Optional sync keeps your phone, laptop and
  any other device in step: pair each one by scanning a QR code or typing a sync
  code. The book is encrypted on the device before it leaves, so the server only
  relays a copy it can't read. Every device still holds its own full copy, and you
  can turn sync off on any device whenever you like.
- **Price lookups go through two stateless proxies to [Finnhub](https://finnhub.io)** —
  `app/api/quote/route.ts` relays a public current price + day change, and
  `app/api/logo/route.ts` serves each company's logo (looked up about once a month and
  cached), so your browser never talks to Finnhub directly. Neither sees or stores
  your positions; a symbol with no logo falls back to its lettered sector circle.
- **Manual price refresh, not background polling.** Nothing fetches on a timer —
  prices are fetched once on page load and again only when you click "Refresh
  prices," to keep API call volume low and predictable.
- **Light theme by default, dark on request.** The toggle is remembered across
  visits. Wide screens get a sidebar; on phones a bottom tab bar (with a raised Log
  button) takes its place.

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
- **Cash deposits**: Log entry → Add cash records money you put into the
  portfolio, in any currency. A non-dollar amount converts at the rate you enter
  ("1 USD = 33.50 THB"), or, left blank, at the daily reference rate for the day
  you added it (`/api/fx/rate`, the last fix on or before that day). The rate is
  saved with the deposit, so its dollar value never moves. Deposits add to cash
  and to the capital "Since start" is measured against, so they never show as a
  gain, and they appear in the recorded log and its CSV.
- **Totals in your currency**: the USD | THB switch on the dashboard header (and
  in Settings) shows the portfolio value, cash, positions and change in your home
  currency at the latest daily reference rate. Per device; prices, fills and P&L
  stay in dollars.
- **Settings** (sidebar, or the gear on phones):
  - *Currency*: which currency the totals show in, and your second (home) currency.
  - *Your data*: Export data (a JSON backup of everything, format v4, which
    includes cash deposits, watchlist order, custom sectors and FX), Export
    recorded log (CSV, one row per buy, sell or cash deposit with date, shares,
    price, amount, realized P&L and Strategy Notes, ready for a spreadsheet),
    Import (restore from a JSON backup, with a preview of what it contains; older
    files still import), Reset to demo data, and Erase all data. Every option that
    replaces data sits behind its own confirmation dialog. Erasing stays erased
    across reloads; it won't silently reseed the demo dataset.
  - *Devices & sync*: name this device, see every paired device and when it last
    synced, pair another, sync now, change the sync code, turn off, delete the
    synced copy, and install the app.
- **Backup reminder**: your book lives on your own devices, and sync is not a
  backup (erasing on one paired device erases on all of them), so Settings shows
  when you last exported a JSON backup ("Last backup Nov 9 · 3 days ago"). After
  14 days without one, a dot appears on the Settings link until you export.
- **Sync devices** (optional): Settings → Devices & sync. One device turns
  sync on and shows a QR code and a sync code; every other device you want in step
  scans it (in the app, so the iPhone Home Screen app works too) or types the code.
  There's no limit on how many devices share one book. The book is encrypted on the
  device (AES-GCM, key derived from the code) before it is stored as one blob on the
  server, which can never read it; there are no accounts. Every device keeps its own
  copy and works offline. Changes push about 2 s after an edit and pull on open, on
  return to the app, on reconnect, every minute and on Refresh. Edits on two devices
  merge item by item (newer wins; fills and journal notes are combined), and deletions
  are remembered so they don't come back. Needs HTTPS (or localhost).
  The device list lives inside the encrypted book. Removing a device only tidies
  the list (it reappears if it syncs again); to lock out a lost device, change the
  sync code, which starts a new synced copy that every device must pair with again.
- **Install as an app**: "Install app" in Settings → Devices & sync (Chrome, Edge, Android),
  or Share → Add to Home Screen on iPhone. It opens full-screen as "Stocks" with
  its own icon, and a service worker (`app/sw.js/route.ts`) keeps the pages on the
  device so it opens offline; prices fall back to the last ones fetched, still
  labelled with their age. Each deploy ships a new worker, and the app offers
  "A new version is available · Reload". Needs HTTPS (or localhost); the worker
  only registers in production builds.
- **Company logos**: fetched through the app's own `/api/logo` route and cached
  for about a month. A symbol with no logo (or a non-US listing) falls back to
  its first letter on the sector colour.
- **Live prices** — current price + day change per symbol via Finnhub, fetched
  on load and on manual refresh only. Every price says how old it is in one
  wording, from the market's own timestamp: "as of 1:00 PM · 9 hr ago" (Finnhub's
  free tier doesn't update outside regular US market hours).
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

## Roadmap

From an audit of the code, the tests and the live site in November 2026. Work runs
in three phases, and each phase starts once the gate before it is met. Everything
stays within the zero-cost rule: free tiers only, nothing that needs a credit card.
Ticked items have shipped.

### Now: harden what exists (about 1–2 weeks)

- [x] **Backup reminder.** Last-backup date in Settings; a dot on the Settings
  link after 14 days without a JSON export.
- [x] **One price-age wording.** "as of 1:00 PM · 9 hr ago" everywhere, from one
  helper (`formatPriceAge` in `lib/priceTime.ts`).
- [ ] **Stop dead API calls.** Every position page calls `/api/history`, which asks
  Finnhub for daily candles, a paid-only endpoint, so it always fails and Trend sits
  on "Gathering history…". Skip `/api/history` and `/api/fundamentals` until a
  provider exists.
- [ ] **Warn past 25 symbols.** `/api/quote` silently drops symbols beyond 25. With
  15 on the watchlist, 11+ open positions leave some holdings unpriced. Warn, or
  split into two requests.
- [ ] **ConfirmDialog everywhere.** Close/Delete position and Delete strategy still
  use the browser's `confirm()` and `alert()`.
- [ ] **CI.** A GitHub Actions workflow running lint, test and build on every push
  and pull request.
- [ ] **Fresh first load.** After a quiet spell, the first quote request can return
  the server's cached price from days ago (labelled honestly with its old time); the
  next request is fresh. Skip the cache when it's older than the last market close.
- [ ] **Held P&L on narrow watchlist rows.** At phone width, a held symbol's P&L
  is cut off at the end of its line.
- [ ] **Contrast fixes.** Light `ink-subtle` text, soft gain/loss badges and the
  dark focus ring fall just short of WCAG AA (measured in [DESIGN.md](DESIGN.md)).
- [ ] **Harden `/api/quote`.** Validate symbols the way `/api/logo` does, and stop
  refetching on every page change.

**Gate 1:** CI is green on `main` and the backup reminder is live.

### Next: use your own data and free feeds

- [x] **CSV export** of the recorded log.
- [ ] **Show stop and target** on the position page and in the P&L breakdown. They
  are entered on every buy but never shown.
- [ ] **Flag a crossed stop or target** when prices refresh.
- [ ] **P/E ratio** from Finnhub's basic financials, if the free tier covers it.
  The endpoint (`/api/fundamentals`) and the Valuation row are already scaffolded.
- [ ] **Earnings-date warning** for held and watched symbols, if Finnhub's free
  earnings calendar covers it.
- [ ] **Daily price history.** Finnhub's free tier has no candles, so this needs a
  second provider (candidate: Twelve Data's free tier, signup only; confirm its
  daily-call limit). One call per symbol lights up the price chart plus Trend
  (50/200 EMA), RSI (14), MACD (12/26/9) and Volume, all already wired to tested
  logic in `lib/indicators.ts` and `lib/signal.ts`. `app/quote-lab` on the
  `test/quote-fetch-lab` branch is the harness for trying providers without
  burning rate limits.
- [ ] **Browser smoke tests** for buy → sell → export → import.

**Gate 2:** a free daily-history provider is chosen.

### Later: bigger data-model changes

- [ ] **Fees and commissions** on fills.
- [ ] **Several brokers or accounts per symbol.** Selling treats every share of a
  symbol as one pool and applies FIFO across its open lots. Fills would need an
  account tag, and Sell would let you pick lots.
- [ ] **Installable phone app** (PWA) with a home-screen icon.
- [ ] **Benchmark** against the S&P 500 (needs daily history).
- [ ] **Dividends and stock splits.**
- [ ] **"How much heat did I take"** (MAE/MFE per position), like the day-trading
  journal has (needs daily history).
- [ ] **Multiple portfolios**, if one cash balance stops being enough.
- [ ] **"Open in Claude"** beside the Analysis tab's Copy prompt. Running analysis
  inside the app would need the paid Claude API, so the tab stays prompt-based.

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
- **Sync bookkeeping** — positions, strategies, watchlist items and custom sectors
  carry `updatedAt`; starting cash and the watchlist order carry their own change
  time; deletions are kept as dated tombstones (`deletions`, pruned after 90 days).
  `SyncBook` and `mergeBooks` live in `lib/sync/book.ts`; the engine in
  `lib/sync/engine.ts`, the encryption in `lib/sync/crypto.ts`, and the server side in
  `app/api/sync/[id]/route.ts` + `lib/server/syncStore.ts`. Theme, hide amounts and
  backup dates are per device and never sync.

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
| Shell | `components/navy/NavyShell.tsx` | Sidebar + top bar from 768px (icons-only sidebar until 1024px), bottom tab bar + Log FAB on phones. |
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

Next.js 16.4 (App Router, Turbopack) + React 19 + TypeScript, Tailwind CSS v4,
Navy Stream (vendored CSS tokens/components), Inter via `next/font`, Recharts,
Zustand (`persist`), SWR, Framer Motion, lucide-react, date-fns, Vitest. Sync uses
the browser's WebCrypto (AES-GCM + HKDF), Upstash Redis as the relay, and
`qrcode` / `jsqr` for pairing.

Dependencies are kept clear of critical and high `npm audit` advisories. Next.js
went from 16.2 to 16.4.1 for that, because no 16.2.x release patches its critical
advisories. What's left is one moderate, lint-time-only advisory (minimatch, via
typescript-eslint), which can't be cleared without a major override.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in FINNHUB_API_KEY — free at finnhub.io/register
                                   # (device sync works locally without Redis: dev uses an in-memory store)
npm run dev      # dev server on :3001
npm run test      # unit tests for indicators, position metrics, and the data core
npm run build     # production build
```

Open [http://localhost:3001](http://localhost:3001). Data seeds itself on first load —
use Settings → "Reset to demo data" to regenerate it. Without `FINNHUB_API_KEY`
set, the app still runs — prices just show "unavailable" instead of crashing (the
quote proxy fails soft on a missing key, same as any other upstream error).

## Deploy

Requires a Node/Edge runtime for its server routes (`/api/quote`, `/api/logo`, `/api/sync`),
so it deploys to **Vercel**, not a static export. Live at
<https://stock-tracker-phi-lyart.vercel.app/>, deployed from `main`. Add `FINNHUB_API_KEY` as an environment variable in
the Vercel project settings — it's read server-side only and never reaches the client.

Device sync needs **Upstash Redis** (free tier): Vercel → Storage → Create database →
Upstash Redis, connected to this project, which sets `KV_REST_API_URL` and
`KV_REST_API_TOKEN` (`UPSTASH_REDIS_REST_URL` / `_TOKEN` also work). Without them the
production sync endpoint answers 503 and the app reports "Sync isn't set up".

## License

[MIT](LICENSE)
