---
name: Stock Tracker — The Deck Log
description: A navigator's watch log for a swing-trading book — ruled bands on one registration axis, every price a fix taken at a stated time.
colors:
  bg: "#070c12"
  card: "#0c141c"
  panel: "#131d27"
  border: "#25313d"
  rule: "#1b2631"
  rule-strong: "#3b4c5e"
  fg: "#e5ecf3"
  fg-muted: "#9fb0c0"
  fg-subtle: "#7b8da0"
  accent: "#5b8ae0"
  accent-strong: "#82a8f0"
  on-accent: "#0a1017"
  gain: "#4fb07a"
  loss: "#e2705a"
  plot: "#6aa9e0"
  plot-quiet: "#506b82"
  ema-fast: "#f0a92e"
  ema-slow: "#6aa9e0"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 8vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums lining-nums"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums lining-nums"
  title:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
  stamp:
    fontFamily: "Azeret Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.02em"
    fontFeature: "tabular-nums lining-nums"
rounded:
  none: "0px"
spacing:
  hair: "0.375rem"
  row: "0.75rem"
  entry: "1rem"
  gutter: "1.5rem"
  band: "1.75rem"
  axis: "11.5rem"
components:
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 0.625rem"
    height: "2rem"
  button-accent-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.on-accent}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.fg-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline-hover:
    textColor: "{colors.fg}"
  button-on-accent:
    backgroundColor: "transparent"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 0.625rem"
    height: "1.75rem"
  tab-active:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem"
  tab-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.fg-subtle}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem"
  band:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.none}"
    padding: "1.75rem 0"
  log-row:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    rounded: "{rounded.none}"
    padding: "0.75rem 0"
  log-row-hover:
    backgroundColor: "{colors.panel}"
  fix-rule:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.stamp}"
    rounded: "{rounded.none}"
    padding: "0 1rem"
    height: "2.5rem"
  fix-rule-quiet:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.fg-muted}"
  input-figure:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.fg}"
    rounded: "{rounded.none}"
    padding: "0 0.5rem"
    height: "2rem"
  menu-surface:
    backgroundColor: "{colors.card}"
    textColor: "{colors.fg}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0"
    width: "15rem"
---

# Design System: Stock Tracker — The Deck Log

## Overview

**Creative North Star: "The Deck Log"**

This is a navigator's watch log, not a trading terminal. The page is a ruled sheet: horizontal bands separated by hairlines, every band's label column locked to a single vertical registration axis (`--axis: 11.5rem`) that runs the full height of the page, so consecutive bands join into one continuous rule rather than reading as a stack of separate objects. There are no floating cards, no elevated stat tiles, no delta chips. Depth is achieved entirely with rule weight and ink value.

The world has two states of the same sheet. Dark is the default — the chart table at night: a deep navy-black ground (`#070c12`), a graphite-blue log plane, cool slate rules. Light is the same sheet on a day watch — cool paper grey (`#eef1f4`), deliberately not cream and not white. Neither is a derived theme; every token carries a first-class value in both.

The surface's honesty is the aesthetic. A price is a *fix* taken at a stated time, and the navy fix rule sits directly under the masthead stating the age of the numbers before any number appears. Nothing refreshes on a timer; the reader presses Refresh prices and the figures re-stamp with a mechanical snap. "Fix" is the system's internal name for a set of prices taken at a moment; the interface itself says it in plain words ("Prices as of …"). Where a figure isn't known, the sheet says so in words ("pending quote", "sold out") instead of implying zero.

**Key Characteristics:**
- Ruled horizontal bands on one continuous registration axis; never cards
- Zero corner radius anywhere in the log world
- Flat by default — the only shadow in the system is the floating-menu drop
- One accent (signal navy), reserved for state-changing controls and the now-marker
- Gain and loss always carry a glyph and an explicit sign alongside colour
- Tabular lining figures globally; type scale encodes magnitude
- Dark and light both authored, both AA-bound

## Colors

A cold instrument palette — navy-black ground, slate rules, one navy signal — with a blue plot ink that is data and never a control. The signal and the plot ink are now both blues, so they are told apart by role and placement (controls vs. charts), not by hue; see the note under Tertiary.

### Primary
- **Signal Navy** (`accent`; light `#1c3664`, dark `#5b8ae0`): the lamp. On the day sheet it is true navy; on the night sheet it is brightened to a navy-family blue, because true navy would vanish against the navy-black ground. It fills the fix rule when there is a real fix to report, backs the Log Position button and Save, underlines the active nav tab, draws the caret and the focus ring, and colours the now-marker. It appears nowhere else.
- **Lamp Strong** (`accent-strong`; light `#122548`, dark `#82a8f0`): hover state of accent grounds and the fix rule's own border — deeper navy by day, brighter blue at night.
- **Lamp Ink** (`on-accent`; light `#f3f6fb`, dark `#0a1017`): the text and iconography that sits on accent grounds — near-white on navy by day, near-black on the brightened blue at night — and the focus-ring colour when the ground is the accent.

### Secondary
- **Starboard Green** (`gain`) / **Port Red** (`loss`): gains and losses on figures, percentages, the P&L bars, the buy/sell items in the Log Position menu, and the destructive item in the Data menu. Never used for emphasis on anything that isn't a signed value.

### Tertiary
- **Plot Blue** (`plot`, aliased by `ema-slow`) and **Quiet Plot** (`plot-quiet`): the blue pencil of a plot sheet. Chart series, allocation bars, cash bars. Data ink only — a plot-blue element is never clickable. Since the accent moved to navy, plot ink and accent share a hue family (dark: plot `#6aa9e0` vs. accent `#5b8ae0`; light: `#1b5fa8` vs. `#1c3664`). The separation now rests on role: accent appears only on controls, the active tab, and the now-marker; plot ink only inside charts. If that ever stops being enough, move the plot ink off blue rather than the accent.
- **Fast EMA** (`ema-fast`, `#f0a92e` dark / `#8a5500` light) keeps the former accent amber on purpose, now independent of the accent, so it stays distinct from the blue slow EMA. It is the only amber left in the system, and it is data ink on the analysis charts, not a control.

### Neutral
- **Night Ground** (`bg`): the page and the sticky masthead.
- **Log Plane** (`card`): floating menu and chart-tooltip surfaces — the only surfaces that leave the sheet.
- **Graphite** (`panel`): row hover, input fields, and the quiet state of the fix rule.
- **Hairline** (`rule`): the intra-band divider — row-to-row, and the axis rule on each band's content cell.
- **Band Rule** (`rule-strong`): the heavier rule that separates one band from the next, outlines controls, and draws scrollbar thumbs.
- **Ink** (`fg`) / **Half Ink** (`fg-muted`) / **Quarter Ink** (`fg-subtle`): headings and figures / secondary readings and control labels / band meta, timestamps, and column headers.
- **Border** (`border`): retained for the un-converted primitives on the other three routes; the log world uses `rule` and `rule-strong`.

### Named Rules
**The Signal Navy Rule.** The accent marks a control that changes state, the active tab, and the now-marker. It is never decoration, never a highlight on a value, never a second brand colour. Audit test: if an accent-coloured element cannot be clicked and is not the now-marker, it is wrong.

**The Two Cues Rule.** Direction is never carried by colour alone. Every gain/loss value ships a glyph (▲ / ▼ / •) and an explicit sign alongside the green or red.

**The Day Watch Rule.** Light is the same sheet at midday, not a bleach of the dark theme: cool paper grey (`#eef1f4`), never cream, never pure white as the page ground. Every token in `@theme` has an authored counterpart in `:root[data-theme="light"]` — no token may be derived, inverted, or left to fall through.

**The AA Floor Rule.** Text and meaningful non-text contrast holds WCAG 2.2 AA in both themes. Measured on the shipped tokens (ink, half ink, quarter ink, gain, loss and accent, each on `bg`, `card` and `panel`; plus `on-accent` on `accent` and on `accent-strong`), the lowest pairing is 4.76:1 light (quarter ink on graphite) and 4.99:1 dark (accent on graphite). The accent itself sits at 10.52:1 light and 5.75:1 dark on the page ground. On accent grounds the focus ring switches to `on-accent` (11.01:1 light, 5.60:1 dark), because the global accent ring would be invisible there.

## Typography

**Display Font:** Archivo (figures and body; `--font-sans`)
**Stamp Font:** Archivo Narrow (band headings and labels; `--font-stamp`, and what `--font-serif` now resolves to)
**Label/Mono Font:** Azeret Mono (fix stamps, timestamps, provenance lines; `--font-mono`)

**Character:** A squarish grotesk for the sheet's figures, a condensed cut for stamped small-caps headings, and a squared mono for anything that reports a time. The pairing reads as printed instrumentation: the numbers are monumental, the labels are rubber-stamped, the times look measured. All three load through `next/font/google`; no system display face and no webfont outside `next/font`.

### Hierarchy
- **Display** (600, `clamp(2.75rem, 8vw, 4.5rem)`, 0.95): the portfolio-summary total — the one number the reader came for. One per page.
- **Headline** (600, 1.875rem): realized P&L, the lead figure of a band.
- **Title** (`.stamp-lg`, 600, 0.8125rem, 0.1em, uppercase): band headings, the wordmark, symbol tickers, strategy names.
- **Body** (400, 0.875rem): menu items, descriptions, empty-entry prose (capped near `max-w-prose`).
- **Label** (`.stamp`, 600, 0.6875rem, 0.14em, uppercase): band meta, column headers, control labels, field labels, tags, nav tabs.
- **Mono** (`.fix-stamp`, 400, 0.6875rem, 0.02em; 0.12em and uppercase in the fix rule): fix ages, timestamps, share counts, starting-cash and footer provenance.

### Named Rules
**The Stamp-Is-The-Heading Rule.** `.stamp` and `.stamp-lg` *are* the band's heading. A stamped line never sits above another heading as a kicker or eyebrow — if a stamped line appears, it is the title of what follows or the meta beneath it, nothing else.

**The Tabular Figure Rule.** `font-feature-settings: "tnum" 1, "lnum" 1` is on at `body`, and every number-bearing element additionally carries `.figure` (tabular, -0.02em) or `.fix-stamp` (tabular mono). Columns of figures must align on the digit; no proportional numerals anywhere.

**The Magnitude Rule.** Type size encodes how much a figure matters, not where it sits. Portfolio total > band lead figure > row figure > sub-figure, and a figure never gets promoted a step for layout balance.

## Layout

One centred column, `max-w-[1200px]`, gutters `1rem` rising to `1.5rem` at `sm`. The floor is 390px.

The page is a vertical stack of bands. Each band is a two-column grid, `var(--axis) 1fr`, at `lg` and above: the stamped heading and its meta live left of the axis, the content cell takes `border-left` on the hairline and `padding-left: 1.5rem`. Because every band repeats the same grid — including the footer and the loading skeleton — the axis reads as one unbroken hairline down the page. Below `lg` the grid collapses to a single column, the heading and meta share a baseline row, and the axis rule drops away rather than shrinking.

Vertical rhythm: `1.75rem` above and below each band's content, `0.75rem` per ruled row (`1rem` for the denser position rows), `1.5rem` column gutter. Bands separate with `border-top` in the heavier band rule; rows inside a band separate with `border-bottom` in the hairline, last row unruled. The footer closes the sheet with a 2px band rule.

Shell furniture is fixed-height: masthead 3rem rising to 3.5rem at `sm` (sticky, `z-40`), the fix rule 2.5rem full-bleed immediately below it, controls 1.75rem (in the fix rule) or 2rem (in the masthead). Below `sm` the nav tabs drop to their own ruled row under the masthead rather than competing with the controls. Data tables collapse from labelled columns to stacked rows with per-cell stamped labels at `sm`.

## Elevation & Depth

The sheet is flat. Bands, rows, figures, charts, and the fix rule have no shadow and no elevated background — separation is carried entirely by rule weight (hairline inside a band, band rule between bands) and ink value. Content never floats.

The one exception is genuinely floating UI: dropdown menus and chart tooltips, which leave the sheet and need to read as above it.

### Shadow Vocabulary
- **Menu drop** (`box-shadow: 0 8px 24px -8px rgba(0,0,0,0.5)`): the Data menu, the Log Position menu, and the allocation chart's tooltip. Paired with a `rule-strong` border and the `card` ground.

### Named Rules
**The Flat Sheet Rule.** If an element is part of the log, it has no shadow. A shadow means the element has left the page — and only transient overlays are allowed to.

## Shapes

Square corners, without exception in the converted world: `border-radius: 0` on buttons, inputs, menus, tooltips, tags, and even the scrollbar thumb. The form language is rules and blocks — the 3px ink bar that prefixes the wordmark, the 3px now-marker travelling its hairline scale, the 2px accent underline on the active tab, the full-bleed accent band. Controls are described by a 1px border in `rule-strong` or by an accent fill; nothing is described by a radius.

Icons are SVG (lucide-react), sized 12–18px. The ▲ / ▼ / • characters are directional data markers on signed values, not an icon set; they never stand in for an interface icon.

### Named Rules
**The Square Corner Rule.** Radius is zero on every surface of the log. A rounded corner in this world is a leak from the old system.

## Components

### Buttons
- **Shape:** square (0 radius), fixed height — 2rem in the masthead, 1.75rem in the fix rule.
- **Accent:** navy fill with lamp ink, stamped label, `0.625rem` horizontal padding. Used for the one primary action per region: Log Position, Save.
- **Outline:** transparent with a 1px `rule-strong` border and half-ink label; hover raises the label to full ink. Theme toggle, Data menu, Refresh prices off the lamp.
- **On-accent:** the same outline button re-inked for the accent band — `on-accent/30` border, `on-accent` label, border goes solid on hover, focus ring switches to `on-accent`.
- **Hover / Focus:** colour-only transitions (`transition-colors`, 100–150ms). No lift, no scale, no shadow. Focus is the global 2px accent outline at 2px offset.
- **Ghost:** bare text in half or quarter ink, hover to full ink. Inline affordances — the cash pencil, Cancel, the P&L expander (which starts open).
- **Grip:** a quarter-ink `GripVertical` at the left of each watchlist row, hover to full ink. It is the only place a drag can start, so pressing the symbol link or the remove button never becomes a drag; it also answers ↑/↓ to move the row from the keyboard, with the new position announced to screen readers.

### Cards / Containers
There are no cards in the log world. The container is the **Band**: `border-top` in the band rule, a `var(--axis) 1fr` grid, `1.75rem` vertical padding, stamped heading left of the axis, content cell taking the axis hairline as its left border. `BandRaw` is the same grid without the top rule, used for the opening Portfolio summary entry so the sheet starts clean. In that entry the total sits left and its ruled sub-entries (Cash, Positions, Change from capital) sit to its right from `md` up, stacking beneath it below `md`; the allocation scale bar closes the entry at full width.

### Inputs / Fields
- **Style:** `panel` ground, 1px `rule-strong` border, 0 radius, 2rem tall, `.figure` numerals for amounts.
- **Focus:** 2px accent outline at 2px offset; caret is the accent.

### Navigation
The masthead is one ruled band: a 3px ink bar plus the stamped wordmark, the three sections as log tabs, and the controls pushed right. Tabs are stamped labels with a 2px bottom border — accent and full ink when active, transparent and quarter ink otherwise, hovering to full ink. Below `sm` the tabs move to their own full-width ruled row and split the width evenly.

### Log Row
The unit of content inside a band: `border-bottom` hairline, `0.75rem` vertical padding, no bottom rule on the last row, optional `panel` hover for interactive rows. Rows are baseline-aligned grids of fixed column widths; on narrow viewports each cell grows its own stamped label. Watchlist rows are reorderable: dragged from the grip, the lifted row takes the `panel` ground and a `rule-strong` outline (no shadow, per the Flat Sheet Rule), the others slide aside, and under reduced motion they jump instead of sliding. The order is saved with the rest of the book.

### Empty Entry
An empty band is left-aligned and ruled, with a stamped title in half ink and one line of quarter-ink prose. It is never centred, never illustrated, never framed — an empty sheet is an honest first run, not an error.

### The Fix Rule (signature)
A full-bleed 2.5rem band directly under the masthead, carrying the age of the data before any figure on the page. When a real fix exists the lamp burns: accent ground, lamp ink, `accent-strong` bottom border, reading `PRICES AS OF <time> · <age>` in uppercase mono (for example `PRICES AS OF 10:17 AM · 1 MIN AGO`, or `PRICES AS OF FRI 4:00 PM · 2 DAYS AGO`), with the privacy toggle and Refresh prices anchored right. The time is the market price's own timestamp, not the moment the app fetched, so a weekend refresh still honestly reads as Friday's close; it shows the time alone for today, the weekday within the past week, and the date beyond that. With nothing logged or the quote upstream unavailable the band goes quiet — `panel` ground, half ink, reading "Prices unavailable", "Loading prices…", "No stocks to price yet" or "Waiting for prices" — rather than implying currency it doesn't have. Watchlist rows repeat the same phrasing per symbol ("as of 10:17 AM"). The **now-marker** is a 3px bar on a hairline scale spanning seven days: hard left on a fresh fix, travelling right as the fix ages, walking back to the start when a fix is taken.

### The Fix Stamp (signature motion)
Every price-derived figure is keyed on a shared fix token (`latestFixToken`). When a new fix lands the key changes and the figure replays `animate-fix-stamp` — `fix-stamp-in` over 140ms on `steps(3, end)`, a 1px settle with an opacity snap. It is a stamp, not a tween. Under `prefers-reduced-motion: reduce` the animation is removed outright and the value simply swaps.

### Named Rules
**The Manual Fix Rule.** Nothing in this app fetches on a timer. Prices change only when the reader presses Refresh prices, and the surface states the age of the data before it states the data. `/api/quote` is the only runtime network request.

**The Accent Ground Focus Rule.** On an accent ground the global accent focus ring is invisible, so the ring and the control's border switch to `on-accent`. Any new control placed on the accent inherits this switch.

**The Absent-Figure Rule.** A figure the app cannot know is written out as absent in words ("pending quote", "sold out") rather than rendered as zero or quietly dropped. Where a figure is approximate, the sheet says how ("N at cost" when a held symbol has no quote yet).

## Do's and Don'ts

### Do:
- **Do** build new surfaces out of `Band` / `BandRaw` / `LogRow` so the registration axis (`--axis: 11.5rem`) stays continuous down the page.
- **Do** define every new token in both `@theme` and `:root[data-theme="light"]`, with an authored light value — never a derivation.
- **Do** reserve the accent for controls that change state, the active tab, and the now-marker.
- **Do** pair every gain/loss colour with a glyph (▲ / ▼ / •) and an explicit sign.
- **Do** put `.figure` on every number and `.fix-stamp` on every time, so figures stay tabular and times read as measurement.
- **Do** key price-derived figures on the fix token so they re-stamp with `animate-fix-stamp` when a fix lands.
- **Do** switch focus rings and control borders to `on-accent` on accent grounds.
- **Do** state what the sheet does not know, in words, where a figure would otherwise go.
- **Do** describe price age in plain words ("Prices as of …", "Refresh prices"); keep "fix" as an internal name only, never as interface copy.
- **Do** hold the 390px floor: collapse the axis, stack the columns, and grow per-cell stamped labels.
- **Do** load type through `next/font` only, from the three families already in the layout.

### Don't:
- **Don't** put a stamped line above a heading as a kicker or eyebrow — the stamp is the heading.
- **Don't** use the accent as decoration, as a background for content, or as emphasis on a value.
- **Don't** introduce a border radius into the log world; every surface is square.
- **Don't** put a shadow on a band, a row, a figure, or a chart — the menu drop is for floating overlays only.
- **Don't** reintroduce the elevated stat-tile grid or a delta chip; a figure belongs in a ruled band, not a card.
- **Don't** signal direction with colour alone, and don't add a third signed colour.
- **Don't** fetch quotes on a timer, animate a live tape, or otherwise imply currency between fixes.
- **Don't** ease a price into place; a fix arrives on `steps(3, end)` in 140ms, and not at all under reduced motion.
- **Don't** add a fourth typeface, a system display face, or a second accent hue.
- **Don't** use proportional numerals or turn off `tnum`/`lnum`.
