# FX Analysis — feature proposal (v2)

Status: **phase 1 built** on branch `fx-analysis` (see §10). Phases 2–3 not started.

Decisions so far (2026-11-12):

| Question | Decision |
|---|---|
| Home currency to design around | **THB** (Thai baht). The feature stays currency-neutral underneath. |
| Build order | **Rate watcher first**, then the book in THB, then the conversion log. |
| Alerts when the app is closed | **Yes, web push**, opt-in, through a server job. |

## 1. Why this belongs in the journal

The book is in US dollars. A Thai investor has two returns on every position: the
stock move in USD and the USD/THB move. When USD/THB falls from 36 to 33.5, the baht
strengthens by about 7%, and that takes about 7% off the book's value in baht while
the USD numbers stay the same. FX Analysis makes that second return visible, and it
helps the user decide calmly when to move money between baht and dollars.

It keeps the product's rhythm: a weekly sit-down, daily reference rates, no tickers
and no countdowns. Alerts arrive at most once a day per alert.

## 2. What the data can and can't do (tested 2026-11-12)

| Source | Result | Use |
|---|---|---|
| **Frankfurter** `api.frankfurter.dev/v2`, no key | ✅ `GET /v2/rate/usd/thb` returned 33.559 (blended reference rate). ✅ Ten years of daily USD/THB (3,665 points) came back in **one** request. ✅ It has a **Bank of Thailand** source (`BOT`, a commercial-bank rate, daily since 2002): `?providers=BOT` returned 33.7532. | All rates, charts, trends and alert checks. |
| **Finnhub** `forex/rates`, `forex/candle` with our key | ❌ "You don't have access to this resource." Not on the free plan. | Not used. There is no free intraday FX, so everything runs on daily rates. |
| **Finnhub** `news?category=forex` | ✅ Works, but headlines have **no currency tags** (`related` is empty). | News feed, filtered by keyword per currency. Expect thin THB coverage. |
| Central-bank calendar | Bank of Thailand MPC meets **6 times a year** and publishes its schedule in advance; the Fed's FOMC meets 8 times a year. | A small static file `data/central-banks.json`, updated by hand once a year from the official schedules. This avoids depending on an API. |

Two findings shape the design:

- **Daily data only.** Without a free intraday source, alerts are checked once a day.
  That fits the weekly cadence, and it also fits Vercel's Hobby plan, where cron jobs
  can run **once a day** (±59 min). A faster check would need Vercel Pro *and* a paid
  intraday feed. Out of scope.
- **Two USD/THB numbers.** The blended mid-market rate (33.56) and the Bank of Thailand
  commercial-bank rate (33.75) differ by about 0.6%. The pair page shows the blended
  rate as the main figure, with the BoT rate under it as "what Thai banks quote".
  This difference also gives the later conversion log a reference for the spread you
  pay.

## 3. Features, in build order

### Phase 1 — Rate watcher (this is the first slice)

1. **Home currency** (per device; not synced). Default USD, which hides FX. Choosing
   THB seeds the FX watchlist with USD/THB, EUR/THB, JPY/THB and GBP/THB.
2. **FX watchlist**: rate, 1W and 1M change, 3-month sparkline. Reorderable. Each pair
   remembers **which way you usually convert** (USD→THB or THB→USD). That decides what
   "a better rate" means everywhere else.
3. **Pair page** (`/fx/usd-thb`)
   - Chart with ranges 1M · 6M · 1Y · 5Y · 10Y, plus the 50/200-day moving averages
     and their crossings (reusing `lib/indicators.ts` and `lib/signal.ts`).
   - 52-week high/low band.
   - **Rate percentile**, worded from your conversion direction: "For USD→THB, today's
     33.56 is better than 18% of days in the past year."
   - Blended rate, and the BoT rate under it.
   - Next policy decisions for both central banks, e.g. "BoT MPC · in 35 days".
   - Headlines matching either currency, at most five, each with its source and age.
4. **Rate alerts**: above or below a level, one-shot or re-arming (§4.3). Each alert
   can carry a note: "Convert ฿200k for the Q1 top-up."
5. **Push delivery**: a daily server check sends a web push when an alert hits (§5).
   When you open the app, it runs the same check, and a hit shows the one fuchsia
   call-out card, like a position past its stop.
6. **Converter**: an amount in any currency, converted at the latest reference rate,
   always shown with the rate's date ("ECB/BoT reference, 12 Nov").

### Phase 2 — The book in THB

7. **Summary banner toggle**: USD ⇄ THB. Value in THB = open value in USD × today's rate.
8. **FX attribution** per position and for the book. Cost in THB uses the rate on
   each fill date (history from Frankfurter). The split reads: "+12.4% in USD,
   −6.9% from USD/THB, +4.7% in THB."
9. **More alert kinds**: moved ±X% within N days, new 52-week high or low, left a
   range, MA crossing.

### Phase 3 — Conversion log

10. Record each conversion: date, amounts, rate you got, provider, note. The app
    shows the spread over the mid-market rate on that day, your average rate so far, and
    whether a new top-up is above or below it.

### Later

- A Sunday **weekly FX digest** push, instead of or alongside per-alert pushes.
- A **conversion planner**: converting a lump sum over N weeks compared with all at
  once, using past data. It describes what would have happened; it is not advice.
- A **correlation view** of pairs against holdings.
- A **"why did it move?"** summary built from the week's headlines and calendar.

### Out of scope

Live tickers, intraday polling, buy/sell signals, "best time to convert" predictions,
leverage or CFDs.

## 4. Data model

### 4.1 Types (`lib/types.ts`)

```ts
/** "USD/THB" = how many THB one USD buys. Always upper case, base/quote. */
export type FxPair = `${string}/${string}`;

/** Which way the user usually converts on this pair. Decides what "a better rate" means. */
export type FxDirection = "base-to-quote" | "quote-to-base";

export interface FxWatchItem {
  pair: FxPair;              // key
  direction: FxDirection;
  addedAt: string;
  /** Last change, for device sync (newer wins). */
  updatedAt: string;
  note?: string;
}

/** Phase 1 has "above" and "below"; the other kinds come in phase 2. */
export type FxAlertCondition =
  | { kind: "above"; level: number }
  | { kind: "below"; level: number }
  | { kind: "move"; pct: number; days: number }
  | { kind: "range-exit"; low: number; high: number }
  | { kind: "year-extreme"; side: "high" | "low" };

export interface FxAlert {
  id: string;
  pair: FxPair;
  condition: FxAlertCondition;
  /** "once" disarms after it fires; "rearm" arms again once the rate is back
   * past the level by REARM_GAP (0.5%), so a rate sitting on the level can't fire daily. */
  repeat: "once" | "rearm";
  state: "armed" | "fired" | "paused";
  firedAt: string | null;   // date of the rate that fired it (YYYY-MM-DD)
  firedRate: number | null;
  note?: string;
  createdAt: string;
  /** Last change, for device sync (newer wins). */
  updatedAt: string;
}

/** Phase 3. */
export interface FxConversion {
  id: string;
  date: string;              // YYYY-MM-DD
  from: { currency: string; amount: number };
  to: { currency: string; amount: number };
  provider: string;          // free text: "Krungsri", "Wise", "IBKR"…
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** A day's rates for one pair, from Frankfurter. Never persisted. */
export interface FxBar {
  date: string;              // YYYY-MM-DD
  rate: number;
}
```

`direction` is the input for the percentile and the "better/worse" wording. Rate
changes themselves are shown **in neutral ink with ▲/▼**, not green or red. A rising
USD/THB is good for someone converting dollars to baht and bad for someone going the
other way. Green and red stay for gains and losses on the book in phase 2.

### 4.2 Sync (`lib/sync/book.ts`)

The FX watchlist, its order, alerts and (in phase 3) conversions are part of the book,
so they sync and are part of export/import (`ExportPayload` v3).

```ts
export interface SyncBook {
  // …existing fields
  fxWatchlist: FxWatchItem[];            // in display order
  fxWatchlistOrderUpdatedAt: string | null;
  fxAlerts: FxAlert[];
  fxConversions: FxConversion[];         // phase 3
}

export type DeletionKind = "position" | "strategy" | "watch" | "sector"
  | "fxwatch" | "fxalert" | "fxconv";
```

| Collection | Key | Merge rule | Tombstone |
|---|---|---|---|
| `fxWatchlist` | `pair` | newer `updatedAt` wins (`mergeList`) | `fxwatch:USD/THB` |
| FX watchlist order | — | newer `fxWatchlistOrderUpdatedAt` wins (`orderWatchlist`, the same as stocks) | — |
| `fxAlerts` | `id` | newer `updatedAt` wins | `fxalert:<id>` |
| `fxConversions` | `id` | newer `updatedAt` wins | `fxconv:<id>` |

Changing FX data only goes through store actions in `store/usePositionStore.ts`:
`addFxPair`, `removeFxPair`, `reorderFxWatchlist`, `setFxDirection`, `addFxAlert`,
`updateFxAlert`, `removeFxAlert`, `markFxAlertFired`, and later `addFxConversion`.
They stamp `updatedAt` and tombstones the same way the stock watchlist does.
`normalize*` back-fills old data with empty lists. Tests in
`lib/__tests__/syncBook.test.ts` cover add/remove/reorder on two devices, an alert
fired on one device while edited on the other (newer wins), and tombstone expiry.

**Per device, never in `SyncBook`:** the home currency, the default chart range, the
push subscription and the push id.

### 4.3 Alert evaluation (`lib/fxAlerts.ts`)

`evaluateFxAlerts(alerts, latestByPair)` is a pure function that returns the alerts
that fire. **The client (on open) and the server (cron) share it**, so a push and the
in-app card always agree. When an alert fires on a device, `markFxAlertFired` records
it. With "rearm", the same function arms the alert again once the rate is back past
the level by 0.5%.

## 5. Push when the app is closed

### 5.1 Flow

```
 device                                   server (Vercel + existing Upstash)
 ──────                                   ─────────────────────────────────
 Settings → "Alert me when closed"
   ├─ Notification.requestPermission()
   ├─ pushManager.subscribe(VAPID key)
   └─ PUT /api/fx/push/<pushId>  ───────▶  fxpush:<pushId> = {
        { subscription, alerts[] }          subscription, alerts[], lastSent{}, tokenHash }
        + write token                       (same token-hash scheme as sync)

 alerts change / sync merge ──re-upload──▶  replace alerts[]

                                           Vercel Cron, daily 10:00 UTC (17:00 Bangkok)
                                             GET /api/cron/fx-alerts  (CRON_SECRET)
                                             ├─ one Frankfurter call for all pairs
                                             ├─ evaluateFxAlerts() per subscription
                                             ├─ skip if lastSent[alertId] = today
                                             └─ web-push → "USD/THB hit 33.50 (below)"
 service worker (app/sw.js/route.ts)  ◀──────┘
   push → showNotification → tap opens /fx/usd-thb
```

### 5.2 What the server stores, and what it doesn't

- It stores: a random `pushId` (**not** the sync id), the browser's push subscription,
  and per alert only `{id, pair, condition, repeat}`.
- It does not store: amounts, notes, positions, the book, the sync code, or any link
  between a push id and a sync id.
- This is a change from "the server sees nothing", so it is **off by default**. The
  opt-in screen says plainly: "To alert you when the app is closed, the server keeps
  the pairs and levels of your alerts. Nothing else."
- Turning it off sends `DELETE /api/fx/push/<pushId>`. A subscription the push service
  reports as gone (404/410) is deleted by the cron job.

### 5.3 Platform notes

- iPhone: web push only works when the app is **added to the Home Screen** (iOS 16.4+).
  On iPhone in a Safari tab, the toggle explains how to install the app instead of
  failing silently.
- Library: `web-push` (VAPID keys in env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `CRON_SECRET`).
- With several devices, each subscribes on its own. Synced alerts are re-uploaded by
  each, so every opted-in device gets the push. That is intended.
- Timing: the Hobby cron runs once a day within an hour of the set time. Frankfurter's
  sources mostly publish once a day, so checking more often wouldn't help.

## 6. Navigation

Phone tab bar is full (4 tabs + centre button). FX goes **inside Analysis** on phones
as a segmented control `Stocks | FX`. From 768px up the sidebar gets its own **FX**
entry. Routes: `/fx` and `/fx/[pair]`, with the pair written `usd-thb`.

## 7. Screen sketches

Wireframes only. Real screens use Navy Stream (`oc-*`, `ns-*`) with no raw colors.
`◆` marks the single fuchsia `accent` call-out.
Rates, percentiles, headlines and meeting dates in the sketches are **illustrative**,
not real schedule data.

### 7.1 Phone — FX watchlist (Analysis › FX)

```
┌──────────────────────────────────┐
│ Analysis                         │  silk header
│ ┌───────────┬──────────────────┐ │
│ │  Stocks   │ ▌FX              │ │  segmented control
│ └───────────┴──────────────────┘ │
│                                  │
│ ◆ USD/THB hit 33.50 (below)      │  call-out, only when an alert fired
│   Today 33.46 · you set 33.50    │
│   [ View pair ]   [ Dismiss ]    │
│                                  │
│ YOUR PAIRS            Edit  ⋮    │  ns-label
│ ┌──────────────────────────────┐ │
│ │ USD/THB        33.559   ╱╲╱‾ │ │
│ │ USD→THB  ▼0.42% 1W ▼1.9% 1M │ │  neutral ink, arrows only
│ │ 🔔 2 alerts · 18th pct (1Y)   │ │
│ ├──────────────────────────────┤ │
│ │ EUR/THB        38.912   ‾╲╱╲ │ │
│ │ THB→EUR  ▲0.10% 1W ▲0.6% 1M │ │
│ ├──────────────────────────────┤ │
│ │ JPY/THB         0.2214  ╲╱‾‾ │ │
│ ├──────────────────────────────┤ │
│ │ + Add pair                   │ │
│ └──────────────────────────────┘ │
│ Reference rates · 12 Nov 2026    │  rate date, always visible
├──────────────────────────────────┤
│  ▦      ☰     ( + )    📈     📄  │  tab bar, unchanged
└──────────────────────────────────┘
```

### 7.2 Phone — pair page

```
┌──────────────────────────────────┐
│ ‹ FX              USD/THB    🔔+ │
│                                  │
│ 33.559                           │  ns-amount-xl
│ ▼0.42% this week                 │
│ Thai banks (BoT) 33.753          │  ns-label, muted
│                                  │
│ ┌──────────────────────────────┐ │
│ │      ╱‾╲                     │ │  line chart
│ │ ‾‾╲_╱   ╲__   ┄┄ 200d MA     │ │
│ │            ╲╱‾╲_  ── 50d MA  │ │
│ │ ░░░░░░░░░░░░░░░░ 52w band    │ │
│ └──────────────────────────────┘ │
│ 1M  6M ▌1Y  5Y  10Y              │
│                                  │
│ ┌ For USD→THB ─────────────────┐ │
│ │ Better than 18% of days in   │ │  percentile card
│ │ the past year                │ │
│ │ 52w range 33.21 ━━●━━━ 36.84 │ │
│ └──────────────────────────────┘ │
│                                  │
│ ALERTS                           │
│ ● below 33.50 · once   "Q1 top-up" │
│ ○ above 35.00 · rearm · paused   │
│                                  │
│ NEXT DECISIONS                   │
│ Fed FOMC     9 Dec   in 27 days  │
│ BoT MPC     17 Dec   in 35 days  │
│                                  │
│ NEWS                             │
│ Baht firms as exporters…  · 3h   │
│ Fed minutes show…        · 1d    │
│                                  │
│ CONVERT                          │
│ [ 1,000 USD ] ⇄ [ 33,559 THB ]   │
└──────────────────────────────────┘
```

### 7.3 Phone — new alert sheet

```
┌──────────────────────────────────┐
│ New alert · USD/THB          ✕   │
│                                  │
│ When the rate goes               │
│ ┌─────────┬─────────┐            │
│ │ ▌Below  │  Above  │            │
│ └─────────┴─────────┘            │
│ Level   [ 33.50          ]       │
│         today 33.559 · 52w 33.21 │
│                                  │
│ Repeat  ( ) Once  (•) Every time │
│ Note    [ Q1 top-up          ]   │
│                                  │
│ ☐ Also when the app is closed    │  first time → opt-in screen (§5.2)
│                                  │
│ [        Save alert         ]    │
└──────────────────────────────────┘
```

### 7.4 Web (≥1024px) — FX page

```
┌────────┬───────────────────────────────────────────────────────────────────────┐
│ ▦ Dash │ FX                                       Home currency: THB ▾  🔔 Push ●│  top bar
│ ☰ Strat├───────────────────────────────────────────────────────────────────────┤
│ 📈 Anal│ ◆ USD/THB hit 33.50 (below) · today 33.46            [View] [Dismiss]  │
│ 💱 FX ▌│                                                                       │
│ 📄 Disc│ ┌ Pairs ────────────────────────────┐ ┌ USD/THB ──────────────────────┐│
│        │ │ Pair     Rate    1W     1M   Pct │ │ 33.559  ▼0.42% wk  BoT 33.753 ││
│        │ │ USD/THB 33.559 ▼0.42 ▼1.9   18th │ │ ┌───────────────────────────┐ ││
│        │ │ EUR/THB 38.912 ▲0.10 ▲0.6   61st │ │ │  chart · MA · 52w band    │ ││
│        │ │ JPY/THB  0.2214 ▲0.31 ▼0.8  44th │ │ └───────────────────────────┘ ││
│        │ │ GBP/THB 44.105 ▼0.05 ▲1.2   72nd │ │ 1M 6M ▌1Y 5Y 10Y              ││
│        │ │ + Add pair                       │ │                               ││
│        │ └──────────────────────────────────┘ │ Alerts        Next decisions   ││
│        │ ┌ Converter ───────────────────────┐ │ ● < 33.50     Fed  9 Dec       ││
│        │ │ [1,000 USD] ⇄ [33,559 THB]       │ │ ○ > 35.00     BoT 17 Dec       ││
│        │ │ Reference rate · 12 Nov 2026      │ │ News                           ││
│        │ └──────────────────────────────────┘ │ Baht firms as exporters… · 3h  ││
│        │                                      └───────────────────────────────┘│
└────────┴───────────────────────────────────────────────────────────────────────┘
```

A data table on the left and the selected pair on the right. From 768px to 1023px the
sidebar is icons only, and the detail moves below the table.

### 7.5 Phase 2 preview — summary banner in THB

```
┌ Book value ─────────────────────────── USD ▌THB ┐
│ ฿1,284,300                                      │
│ +฿56,900 (+4.7%)   ← green: gain on the book    │
│   stock move +12.4%  ·  USD/THB −6.9%            │
└─────────────────────────────────────────────────┘
```

## 8. First slice — what "done" looks like

- `app/api/fx/rates` and `app/api/fx/history` proxy Frankfurter with `revalidate`
  of a few hours. History is one request per pair and range.
- Home-currency setting; FX watchlist with direction; pair page with chart, MAs,
  52-week band, percentile, BoT rate, calendar from `data/central-banks.json`, news.
- Above/below alerts with once/rearm and notes; synced with merge rules and tests.
- Check on open with the call-out card; opt-in push with the daily cron, the service
  worker handler, and delete on opt-out.
- Phone and web layouts per §6–7. `npm test` and `npm run lint` pass.

## 9. Still open

- Placement on phone: inside Analysis (proposed) or swap a tab?
- Cron time: 17:00 Bangkok (proposed), after the BoT publishes its daily rate?
- News: Finnhub forex headlines rarely mention the baht. Is that acceptable for
  phase 1, or should we test another source (for example the free GDELT news API)
  before building?

## Sources

- Frankfurter API — https://frankfurter.dev/ (tested live 2026-11-12)
- Finnhub API docs — https://www.finnhub.io/docs/api (forex rates/candles tested: not on free plan)
- Vercel cron limits — https://vercel.com/docs/cron-jobs/usage-and-pricing
- Bank of Thailand MPC meetings — https://www.bot.or.th/en/our-roles/monetary-policy/mpc-meeting.html
- Next.js PWA / web push — https://nextjs.org/docs/app/guides/progressive-web-apps
- Wise rate alerts — https://wise.com/tools/exchange-rate-alerts/
- TradingView alert types — https://www.tradingview.com/support/solutions/43000520149
- Sharesight multi-currency — https://www.sharesight.com/blog/value-your-investments-in-any-currency-with-sharesight/

## 10. What phase 1 shipped (2026-11-13)

Built as specified in §3–8, with these differences:

- **Alert dismissal.** `FxAlert` has a `seen` flag: the call-out shows fired alerts
  until dismissed. A fired "once" alert stays listed with a **Re-arm** button.
- **Web FX page.** `/fx` shows the table with the converter and push card beside it;
  the full pair view lives on `/fx/[pair]` rather than in a side panel. Below 1280px
  the two columns stack, because the table didn't fit next to a side column.
- **News** reads Finnhub's *forex and general* feeds: the forex feed alone held a
  single story when tested. Baht headlines are still rare.
- **Calendar** covers the Fed and the Bank of Thailand. The Fed's 26–27 Oct 2027
  meeting is left out: it is a strategy meeting with no rate vote.
- **Export** files are now version 3 and carry the FX watchlist and alerts. v1/v2 files still import.

Where things are:

| Piece | Files |
|---|---|
| Rates, maths | `lib/fx.ts`, `lib/server/frankfurter.ts`, `app/api/fx/{history,latest,news}` |
| Alerts | `lib/fxAlerts.ts`, `components/fx/FxAlertWatcher.tsx` (check on open), `FxAlertCallout.tsx`, `FxAlertDialog.tsx` |
| Sync | `lib/sync/book.ts` (`fxWatchlist`, `fxWatchlistOrderUpdatedAt`, `fxAlerts`, tombstones `fxwatch:` / `fxalert:`), store actions in `store/usePositionStore.ts` |
| Push | `lib/fxPushClient.ts`, `lib/fxPushPlan.ts`, `lib/server/fxPushStore.ts`, `app/api/fx/push/[id]`, `app/api/cron/fx-alerts`, `vercel.json`, push handlers in `app/sw.js/route.ts` |
| UI | `app/fx`, `app/fx/[pair]`, `components/fx/*`; FX in the sidebar; `Stocks | FX` switch on phones |
| Calendar | `data/central-banks.json`, `lib/fxCalendar.ts` |

**To turn push on in production:** run `npx web-push generate-vapid-keys`, then set
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:`) and
`CRON_SECRET` in Vercel, alongside the existing Upstash Redis variables. Push can't
be tried locally, because the service worker only registers in production builds.
