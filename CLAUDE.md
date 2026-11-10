@AGENTS.md

## Design system

All UI uses **Navy Stream**. Its colors and styles live in `styles/navy-stream/tokens.css` (tokens) and `styles/navy-stream/bundle.css` (`oc-*` component classes), both loaded app-wide from `app/layout.tsx` along with the Inter font.

- Use Navy Stream colors and styles from those files. Never write raw color codes (hex, `rgb()`, `hsl()`) in components or CSS.
- In Tailwind, use the `ns-*` utilities bridged in `app/globals.css` (`bg-ns-card`, `text-ns-ink`, `rounded-ns-lg`, `shadow-ns-card`…) and the `ns-*` type classes (`ns-amount-xl`, `ns-heading`, `ns-label`…). Outside Tailwind, use `var(--token)`.
- `bundle.css` is unlayered, so its `oc-*` rules beat Tailwind utilities. To override one of their properties, use Tailwind's `!` modifier (`px-4!`).
- Stocks are not spending: gains use `success` (green), losses use `danger` (red).
- Sectors reuse the `cat-*` category colors through `lib/sectors.ts`. User-made sectors (`customSectors` in the store, part of export/import) pick from the same six colors and override the built-in table.
- Currency is US dollars (`$`).
- Two platform sets (`components/navy/NavyShell.tsx`): phones (below 768px) get the silk header and bottom tab bar; from 768px the web set takes over (sidebar, icons only until 1024px, top bar, summary banner, data tables). Never stretch the phone layout onto a wide screen. Light is the default theme.
- Fuchsia `accent` means "act on this now" only (a position past its stop or target): at most one call-out card per page, never for text, large areas, or gains/losses.
- Every route is on Navy Stream; the old deck-log tokens and classes are gone. Shared primitives live in `components/navy/primitives.tsx` and `components/ui/`.
