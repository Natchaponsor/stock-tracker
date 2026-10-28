@AGENTS.md

## Design system

All UI uses **Navy Stream**. Its colors and styles live in `styles/navy-stream/tokens.css` (tokens) and `styles/navy-stream/bundle.css` (`oc-*` component classes), both loaded app-wide from `app/layout.tsx` along with the Inter font.

- Use Navy Stream colors and styles from those files. Never write raw color codes (hex, `rgb()`, `hsl()`) in components or CSS.
- In Tailwind, use the `ns-*` utilities bridged in `app/globals.css` (`bg-ns-card`, `text-ns-ink`, `rounded-ns-lg`, `shadow-ns-card`…) and the `ns-*` type classes (`ns-amount-xl`, `ns-heading`, `ns-label`…). Outside Tailwind, use `var(--token)`.
- `bundle.css` is unlayered, so its `oc-*` rules beat Tailwind utilities. To override one of their properties, use Tailwind's `!` modifier (`px-4!`).
- Stocks are not spending: gains use `success` (green), losses use `danger` (red).
- Sectors reuse the `cat-*` category colors through `lib/sectors.ts`. User-made sectors (`customSectors` in the store, part of export/import) pick from the same six colors and override the built-in table.
- Currency is US dollars (`$`).
- Phones get the bottom tab bar; wide screens (`md` and up) get the top menu (`components/navy/NavyShell.tsx`). Light is the default theme.
- Every route is on Navy Stream; the old deck-log tokens and classes are gone. Shared primitives live in `components/navy/primitives.tsx` and `components/ui/`.
