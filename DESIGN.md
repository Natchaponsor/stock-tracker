---
name: Stock Tracker — Navy Stream
description: A calm, card-based swing-trading book on the Navy Stream system. An ocean-silk header holds the one number you came for, and white cards rise out of it.
source:
  tokens: styles/navy-stream/tokens.css
  components: styles/navy-stream/bundle.css
  bridge: app/globals.css
  primitives: components/navy/primitives.tsx, components/ui/
defaultTheme: light
colors:
  # Light values; dark overrides are listed under "Colors → Dark theme".
  ocean-50: "#eaf2fc"
  ocean-100: "#d3e4f8"
  ocean-300: "#6fa6e8"
  ocean-400: "#3a80d8"
  ocean-500: "#0a5bc4"
  ocean-700: "#07438f"
  ocean-900: "#04295a"
  surface-page: "#f3f5f9"
  surface-card: "#ffffff"
  surface-sunken: "#eef1f6"
  line: "#e3e8f0"
  ink: "#0f1b2d"
  ink-muted: "#5b6b80"
  ink-subtle: "#6e7d91"
  primary: "#0a5bc4"
  primary-text: "#0a5bc4"
  primary-soft: "#eaf2fc"
  on-primary: "#ffffff"
  hero-glow: "#6fa6e8"
  hero-mid: "#3a80d8"
  hero-base: "#0a5bc4"
  hero-deep: "#07438f"
  hero-glass: "rgba(255,255,255,0.14)"
  hero-glass-line: "rgba(255,255,255,0.24)"
  on-hero-muted: "rgba(255,255,255,0.80)"
  success: "#14804a"
  success-soft: "#e3f6eb"
  danger: "#d02f2f"
  danger-soft: "#fdeaea"
  warning: "#a35f00"
  warning-soft: "#fff2dc"
  cat-food: "#ee7b1e"
  cat-transport: "#5b62e0"
  cat-shopping: "#22a55b"
  cat-fun: "#e04fc4"
  cat-bills: "#8b5cf6"
  cat-health: "#14a3a3"
typography:
  fontFamily: "Inter (self-hosted via next/font), system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  amount-xl: { weight: 600, size: "44px", lineHeight: "52px", tracking: "-0.02em", class: "ns-amount-xl" }
  amount-lg: { weight: 600, size: "32px", lineHeight: "38px", tracking: "-0.02em", class: "ns-amount-lg" }
  amount-md: { weight: 600, size: "22px", lineHeight: "28px", tracking: "-0.01em", class: "ns-amount-md" }
  title: { weight: 700, size: "26px", lineHeight: "32px", tracking: "-0.01em", class: "ns-title" }
  heading: { weight: 600, size: "17px", lineHeight: "24px", class: "ns-heading" }
  body: { weight: 400, size: "15px", lineHeight: "22px", class: "ns-body" }
  label: { weight: 500, size: "13px", lineHeight: "18px", class: "ns-label" }
  caption: { weight: 500, size: "11px", lineHeight: "14px", tracking: "0.01em", class: "ns-caption" }
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
shadows:
  card: "0 1px 2px rgba(15,27,45,.04), 0 6px 18px rgba(15,27,45,.05)"
  primary: "0 8px 20px rgba(10,91,196,.32)"
  bar: "0 -4px 24px rgba(15,27,45,.06)"
components:
  hero: { class: "oc-silk rounded-ns-xl", text: "{colors.on-primary}" }
  glass-chip: { class: "oc-glass", background: "{colors.hero-glass}", border: "{colors.hero-glass-line}", rounded: "{rounded.md}" }
  card: { class: "oc-card / NsCard", background: "{colors.surface-card}", rounded: "{rounded.lg}", shadow: "{shadows.card}", padding: "16px" }
  button-primary: { class: "oc-btn-primary / <Button variant=primary>", background: "linear-gradient(90deg, ocean-400, ocean-500)", text: "{colors.on-primary}", rounded: "{rounded.full}", shadow: "{shadows.primary}" }
  button-secondary: { class: "oc-btn-secondary / <Button variant=secondary>", background: "{colors.primary-soft}", text: "{colors.primary-text}", rounded: "{rounded.full}" }
  button-ghost: { class: "<Button variant=ghost>", text: "{colors.ink-muted}", hover: "{colors.surface-sunken}" }
  button-danger: { class: "<Button variant=danger>", background: "{colors.danger-soft}", text: "{colors.danger}" }
  fab: { class: "oc-fab", size: "56px", background: "linear-gradient(160deg, ocean-400, ocean-500)", shadow: "{shadows.primary}" }
  badge-up: { class: "oc-badge-up / NsChangeBadge", text: "{colors.success}", background: "{colors.success-soft}" }
  badge-down: { class: "oc-badge-down / NsChangeBadge", text: "{colors.danger}", background: "{colors.danger-soft}" }
  badge-info: { class: "oc-badge-info", text: "{colors.primary-text}", background: "{colors.primary-soft}" }
  track: { class: "oc-track + oc-fill", height: "8px", background: "{colors.surface-sunken}", rounded: "{rounded.full}" }
  segmented: { class: "<Segmented> (oc-seg pattern)", background: "{colors.surface-sunken}", selected: "{colors.surface-card} + {shadows.card}" }
  symbol-mark: { class: "SymbolMark (oc-cat-icon)", ring: "sector colour, 2px", fill: "company logo; sector-coloured letter as fallback" }
  tabbar: { class: "oc-tabbar", background: "{colors.surface-card}", rounded: "{rounded.xl}", shadow: "{shadows.bar}", breakpoint: "below md" }
  dialog: { class: "ConfirmDialog", background: "{colors.surface-card}", rounded: "{rounded.lg}", scrim: "ocean-900 / 50%" }
---

# Design System: Stock Tracker — Navy Stream

## Overview

**North star: "Calm water, one number."**

The dashboard opens on a deep ocean-silk header that holds the figure you came for, the portfolio total, set large in white. Everything else sits on white cards that rise out of the bottom of that header. The cards overlap its lower edge (`-mt-7`), so their rounded corners form the curve and no strip of page shows between them. The rest of the app is the same cards on a cool grey page.

Navy Stream is a vendored design system, not something invented here. Its tokens and component classes are copied into `styles/navy-stream/` and used as they come. This app's job is to map its finance surfaces (P&L, allocation, watchlist, log) onto those pieces without adding new colours, radii, or type sizes.

The honesty rules from the old deck-log design still apply, now written in plain words. A price says how old it is ("Prices as of 10:17 AM · 1 min ago"). Nothing refreshes on a timer. A figure the app can't know is shown in words, never as zero.

**Key characteristics**
- Light is the default theme; dark is a full token override, not an inversion.
- One brand hue (ocean blue). Green and red are kept for signed values only.
- Cards with soft shadows and generous radii. The hero is the only gradient surface.
- Inter throughout, tabular figures on every number (`oc-num`).
- Phones get a bottom tab bar with a raised Log button; md+ gets a top menu.

## How the system is wired

| Layer | File | What lives there |
|---|---|---|
| Tokens | `styles/navy-stream/tokens.css` | Every colour, space, radius, shadow and type value as a CSS variable. Light on `:root`, dark on `:root[data-theme="dark"]`. |
| Component classes | `styles/navy-stream/bundle.css` | The system's `oc-*` classes (`oc-silk`, `oc-card`, `oc-btn-*`, `oc-badge-*`, `oc-track`, `oc-tabbar`, `oc-cat-icon`, …). Copied verbatim except the Google Fonts `@import`, which is dropped because Inter is self-hosted with `next/font`. |
| Tailwind bridge | `app/globals.css` | `@theme inline` maps tokens to `ns-*` utilities: `bg-ns-card`, `text-ns-ink-muted`, `border-ns-line`, `rounded-ns-lg`, `shadow-ns-card`, etc. Also defines the type classes (`ns-amount-xl` … `ns-caption`), the focus ring, and the reduced-motion kill switch. |
| Primitives | `components/navy/primitives.tsx` | `NsCard`, `NsEmpty`, `NsPnl`, `NsChangeBadge`, `SymbolMark`, `NsSkeleton`. |
| UI kit | `components/ui/` | `Button`, `Badge`, `Card`, `Segmented`, `ConfirmDialog`, `Skeleton`, `PnlText`, `CountUp`, `EmptyState`, all re-skinned onto `ns-*` utilities. |
| Shell | `components/navy/NavyShell.tsx` | Top menu (md+), bottom tab bar + FAB (phones), page width, footer. |
| Sectors | `lib/sectors.ts` | Maps each sector to a `cat-*` token; resolves a symbol's sector (custom choice first, then the built-in table). |

**Two cascade facts to know before styling anything:**
1. `bundle.css` is **unlayered**, so `oc-*` rules beat Tailwind utilities. To override one, use Tailwind's important suffix: `grid-cols-[…]!`, `px-1!`. (The tab bar in `NavyShell` does exactly this.)
2. `globals.css` pins Tailwind's own `--radius-sm…xl`, so `rounded-lg` keeps Tailwind's size. Navy Stream radii are always `rounded-ns-*`.

## Colors

### Brand: ocean
- **Primary** (`primary` `#0a5bc4`): fills, the primary-button gradient end, the focus ring, the caret. Same value in both themes.
- **Primary text** (`primary-text`; light `#0a5bc4`, dark `#7fb0ee`): blue *text* such as links, the active nav pill, the active tab, and info badges. In dark mode it is brightened so it stays readable on navy cards. Use this, not `primary`, for anything that is text.
- **Primary soft** (`primary-soft`; light `#eaf2fc`, dark `#10284a`): the active nav pill, secondary buttons, info badges, text selection.
- **Ocean ramp** (`ocean-50 … ocean-900`): gradient stops for buttons and the FAB (`ocean-400 → ocean-500`), pressed state (`ocean-700`), dialog scrim (`ocean-900/50`), and the `ocean-100` hover on secondary buttons.

### Hero
`hero-glow`, `hero-mid`, `hero-base`, `hero-deep` are the four stops of `oc-silk`, the radial "silk" gradient behind the portfolio header. On top of it, `hero-glass` / `hero-glass-line` make the frosted chips (price age, stats, controls), and `on-hero-muted` is secondary text on the silk. These tokens are used **only** inside the hero.

### Surfaces and ink
- `surface-page` (page), `surface-card` (cards, dialogs, tab bar), `surface-sunken` (track backgrounds, segmented controls, chart grids, ghost-button hover), `line` (hairlines and borders).
- `ink` (headings, figures), `ink-muted` (secondary text, labels, inactive tabs), `ink-subtle` (meta and least-important captions; see the accessibility notes before using it for small text in light mode).

### Signed values
- **Gains → `success`, losses → `danger`. Always.** Text uses the full colour; badges use the `-soft` ground with the full-colour text (`oc-badge-up` / `oc-badge-down`). Flat or zero values use `ink-muted` (or `oc-badge-info`).
- Colour never works alone: `NsPnl` and `NsChangeBadge` add a ▲/▼ glyph and an explicit sign.
- `warning` / `warning-soft` are for stale or caution states, never for direction.

### Sectors
Sectors reuse the system's category colours. They never introduce new ones:

| Sector | Token |
|---|---|
| Technology | `cat-transport` |
| Energy | `cat-food` |
| Healthcare | `cat-health` |
| Consumer | `cat-shopping` |
| Financials | `cat-bills` |
| Communication | `cat-fun` |
| Other | `ink-subtle` |

`resolveSector(symbol, customSectors)` is the only way to get a symbol's sector and colour. A user can create their own named sector ("Assign new sector" on the allocation card). It must wear one of the six `cat-*` swatches (`SECTOR_SWATCHES`), never a free colour, and the symbols assigned to it win over the built-in table. Custom sectors are stored with the book and travel in export/import (format v2).

### Dark theme
`app/layout.tsx` sets `data-theme` before paint from `localStorage` (default `light`). Dark overrides: page `#0b1220`, card `#141e2e`, sunken `#1b2840`, line `#26344b`, ink `#eef3fa` / `#a3b1c4` / `#8696ad`, primary-text `#7fb0ee`, primary-soft `#10284a`, hero `#4a86d4` / `#2a6cc0` / `#094fab` / `#05306a`, success `#5fd895` on `#0f2e1f`, danger `#f27b7b` on `#3a1616`, warning `#f5b94a` on `#3a2a0c`, plus heavier card/bar shadows. Ocean ramp, cat colours, spacing, radii and type are shared.

## Typography

One family: **Inter**, self-hosted through `next/font` (`--font-inter` → `--font-sans`). No second face.

| Class | Spec | Used for |
|---|---|---|
| `ns-amount-xl` | 600 · 44/52 · −0.02em | The portfolio total in the hero. One per page. |
| `ns-amount-lg` | 600 · 32/38 · −0.02em | A page's lead figure (e.g. the Disclosures total). |
| `ns-amount-md` | 600 · 22/28 · −0.01em | Card lead figures (realized / unrealized P&L). |
| `ns-title` | 700 · 26/32 · −0.01em | Page titles. |
| `ns-heading` | 600 · 17/24 | Card headings, dialog titles, the wordmark. |
| `ns-body` | 400 · 15/22 | Prose, descriptions, menu items. |
| `ns-label` | 500 · 13/18 | Row text, column headers, field labels, nav. |
| `ns-caption` | 500 · 11/14 · 0.01em | Timestamps, meta, tab-bar labels. |

- Every number carries `oc-num` (tabular figures) so columns align on the digit.
- The hero total dims its cents with `oc-decimals` (55% opacity), so the dollars carry the weight.
- Size follows importance, not layout: hero total > page lead > card lead > row figure.

## Layout

- **Width:** one centred column, `max-w-[1200px]`, `px-4` rising to `px-6` at `md`. Holds down to 360–390px.
- **Shell (`NavyShell`):**
  - **md and up:** a sticky top header with the silk brand square, "Stock Tracker" in `ns-heading`, a pill nav (Dashboard, Strategies, Analysis, Disclosures; active = `bg-ns-primary-soft text-ns-primary-text`), then the refresh button (off-dashboard), theme toggle, Data menu and the Log position pill.
  - **Phones:** a fixed bottom `oc-tabbar` (max 480px wide) with the four sections and the Log position FAB raised in the centre column. The page gets bottom padding so content never hides under it.
- **Dashboard:** the silk hero, then a `Sheet` grid that pulls up into it, one column below `lg` and **two columns from 1024px** (`lg:grid-cols-2`). Order: P&L · Allocation by sector · Watchlist (full width) · Recorded log (open) · Strategy performance (collapsed).
- **Container queries over breakpoints for card internals.** A card in the two-column grid is narrow even on a wide screen, so tables inside cards respond to the *card's* width. The P&L table is `@container`, and its "% Portfolio" column appears only at `@lg` (card ≥ 32rem). Narrower cards show the share as a bar line under the row.
- **Spacing** sticks to the 4px scale (`--space-1…8`). Card padding is 16px, and the gap between cards is 12px, or 16px at `lg`.

## Elevation and depth

Three shadows, each with one job:
- **`shadow-card`**: every card, the selected segment, dialogs, menus.
- **`shadow-primary`**: the blue glow under primary buttons and the FAB. Nothing else gets it.
- **`shadow-bar`**: the upward shadow on the phone tab bar.

The silk hero sits flat. Depth there comes from the gradient and the frosted glass chips. Cards never stack on cards. A section inside a card is separated with a `line` hairline or a `surface-sunken` ground, not another shadow.

## Shapes

| Token | Size | Where |
|---|---|---|
| `rounded-ns-sm` | 10px | Small inner elements, skeleton bars, inputs inside tight rows |
| `rounded-ns-md` | 14px | Glass chips, fields, tiles, menu items |
| `rounded-ns-lg` | 20px | Cards, dialogs |
| `rounded-ns-xl` | 28px | The hero, the tab bar |
| `rounded-full` | pill | Buttons, badges, tracks, nav pills, avatars/SymbolMarks |

Icons are lucide-react, 16–20px, stroke style. The ▲/▼ characters are data markers on signed values, not icons.

## Components

- **Hero (`PortfolioOverview`).** `oc-silk rounded-ns-xl`. Top row: an `oc-glass` chip reading "Prices as of …" (short form on phones) and the privacy toggle (Eye/EyeOff hides amounts). Centre: "Portfolio summary", the total in `ns-amount-xl oc-num` with `oc-decimals`. Below: a 3-column `oc-glass` strip of Cash (editable), Positions and Change from starting capital.
- **Card (`NsCard`).** `oc-card` with a heading row (`title`, optional `meta`, optional `action`). `collapsible` + `defaultOpen` turn the heading into a disclosure button. Every dashboard section is one of these.
- **P&L (`NsPnl`, `NsChangeBadge`).** Signed text or pill with glyph + sign, coloured by the signed-values rule.
- **SymbolMark.** A circle in the symbol's sector colour with the company logo inset by a 2px ring, so the sector still reads at a glance. Logos come from the app's own `/api/logo` route. If one is missing or fails, the circle shows the ticker's first letter on the sector colour. The `title` names the sector.
- **Bars (`oc-track` + `oc-fill`).** 8px pill tracks on `surface-sunken` for allocation and share-of-portfolio. Fill is the sector colour, or success/danger for P&L.
- **Allocation by sector.** Bar per sector plus a cash slice. "Assign new sector" opens `SectorDialog` to name a sector, pick its swatch and assign symbols.
- **Watchlist.** Up to 15 symbols, then a quiet "Watchlist full (15 symbols max). Remove one to add another." note in place of the add field. Rows reorder by dragging the grip only (framer-motion `Reorder` + `useDragControls`). The grip also takes ↑/↓, and an `aria-live` region announces the new position.
- **Buttons (`components/ui/Button`).** `primary` (blue gradient + glow, one per region: Log position, Save), `secondary` (soft blue), `ghost` (muted text, sunken hover), `danger` (soft red, for destructive confirms). All pill-shaped.
- **Segmented (`components/ui/Segmented`).** The `oc-seg` pattern: sunken track, selected option lifts onto a card ground with `shadow-card`.
- **ConfirmDialog.** Destructive actions go through it: card ground, `rounded-ns-lg`, `ocean-900/50` scrim, scale-and-fade entrance. The Data menu (reset, erase, import) uses it today. *Gap:* the position page's Close and Delete buttons still use the browser's native `confirm()` and should move to `ConfirmDialog`.
- **Empty states (`NsEmpty`).** One muted line saying what's missing and how to add it. Never an illustration, never an error tone.
- **Skeletons.** `DashboardSkeleton` mirrors the hero-plus-cards shape so nothing jumps when the persisted store hydrates.
- **Legacy names.** `components/log/Band.tsx` keeps `Band` / `BandRaw` / `LogRow` / `EmptyEntry` as thin wrappers over `NsCard` / `NsEmpty`, so the Disclosures page keeps its structure. New code should use the Navy primitives directly.

## Motion

- **Price stamp.** Price-derived figures are keyed on the latest quote token. When fresh prices land they replay `animate-fix-stamp` (140ms, `steps(3, end)`): a quick snap, not a count-up tween.
- **Reorder.** Watchlist rows slide aside during a drag.
- **ConfirmDialog** fades and scales in from 96%.
- **Reduced motion.** `<MotionConfig reducedMotion="user">` plus a global rule in `globals.css` remove animations and transitions under `prefers-reduced-motion: reduce`. Values just swap.

## Data honesty rules

- **Manual refresh only.** Prices are fetched on load and when you press "Refresh prices". Nothing polls.
- **Age before value.** The hero chip states the quote's own timestamp ("Prices as of Fri 4:00 PM · 2 days ago"), not the fetch time. Watchlist rows repeat it per symbol.
- **Absent, not zero.** Unknown figures read "pending quote", "Prices unavailable", "N at cost", etc.
- **Two server touchpoints.** `/api/quote` and `/api/logo` are the only runtime requests. Both are stateless Finnhub proxies, so the browser never talks to Finnhub.

## Accessibility notes (measured)

The focus ring is a global 2px `primary` outline at 2px offset. Contrast ratios below are measured on the shipped tokens against WCAG 2.2 AA (4.5:1 for normal text, 3:1 for large text and UI).

**Passes in both themes:** `ink` and `ink-muted` on every surface (lowest 4.81:1, light `ink-muted` on sunken); `primary-text` on card and on primary-soft; `success`/`danger`/`warning` text on cards; white on `primary` (6.35:1); white and `on-hero-muted` on `hero-base`/`hero-deep`; every dark-theme badge pairing.

**Known gaps. Treat these as constraints when placing text:**
- **Light `ink-subtle`** is 4.20:1 on card, 3.84 on page and 3.71 on sunken. It's fine for large or non-essential text, but use `ink-muted` for small text that matters.
- **Light soft badges:** `success` on `success-soft` measures 4.42:1 and `danger` on `danger-soft` 4.39:1, just under 4.5. Badge text is 12px/500, so the badge glyph and sign carry the meaning too.
- **Hero highlight areas:** the glow/mid stops of `oc-silk` are lighter (white on `hero-glow` 2.53:1 light / 3.72 dark). Keep hero text over the base/deep part of the gradient, and keep `on-hero-muted` text off the top-left glow.
- **Dark focus ring:** `primary` against the dark page is 2.95:1, just under the 3:1 UI minimum.
- **SymbolMark fallback letters:** white on most `cat-*` colours is 2.8–4.2:1 (only `cat-transport` passes at 4.92). The mark is `aria-hidden` and the ticker is always printed beside it, so the letter is decoration, but don't rely on it to carry information.

These come from the vendored system's values. Fixing them means changing the tokens upstream, or adding a documented local override, rather than patching single components.

## Do's and don'ts

### Do
- **Do** style with `ns-*` utilities (`bg-ns-card`, `text-ns-ink-muted`, `rounded-ns-lg`, `shadow-ns-card`) or `var(--token)` in inline styles. Use `oc-*` classes where the system already has the component.
- **Do** reach for an existing primitive (`NsCard`, `NsPnl`, `NsChangeBadge`, `SymbolMark`, `Button`, `Segmented`, `ConfirmDialog`) before writing markup.
- **Do** colour gains `success`, losses `danger`, and add the glyph and sign.
- **Do** get sector colours only through `lib/sectors.ts`.
- **Do** put `oc-num` on every figure.
- **Do** use `primary-text` for blue text and `primary` for blue fills.
- **Do** use container queries for anything inside a card that changes with width.
- **Do** check both themes. Light is the default, so design there first.
- **Do** override an `oc-*` rule with Tailwind's `!` suffix rather than editing `bundle.css`.

### Don't
- **Don't** write a raw colour (`#hex`, `rgb()`, a Tailwind palette colour like `text-blue-600`) in a component or stylesheet. The only raw values allowed are the vendored ones in `styles/navy-stream/`.
- **Don't** use `rounded-sm/md/lg/xl` for Navy surfaces. Those are Tailwind's sizes; use `rounded-ns-*`.
- **Don't** add a colour, radius, shadow or type size that isn't a token. If one is missing, add it to `tokens.css` (with a dark value) and bridge it in `globals.css`.
- **Don't** use hero tokens (`hero-*`, glass, `on-hero-muted`) outside the silk header.
- **Don't** use `success`/`danger` for emphasis or decoration, or `warning` for direction.
- **Don't** put a shadow on something inside a card, or nest cards.
- **Don't** fetch on a timer or animate a value as if it were streaming.
- **Don't** edit `bundle.css` or `tokens.css` for one component's needs. They mirror the upstream system.
