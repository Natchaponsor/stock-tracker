@AGENTS.md

## Device sync

The book can sync between devices, encrypted on the device (`lib/sync/`). Synced data is positions, strategies, watchlist (and its order), custom sectors and starting cash.

- Change synced data only through the store actions in `store/usePositionStore.ts`: they stamp `updatedAt`, record tombstones in `deletions` on delete, and stamp `startingCashUpdatedAt` / `watchlistOrderUpdatedAt`. Setting these fields directly breaks merging.
- A new synced field or collection needs a change time, a merge rule in `lib/sync/book.ts`, a place in `selectSyncBook`/`applySynced`, and a test in `lib/__tests__/syncBook.test.ts`.
- Per-device settings (theme, hide amounts, backup dates) never go into `SyncBook`.
- The sync code is the only secret. It lives in localStorage under `stock-tracker-sync`, never in the book, exports or URLs (a `#pair=` link is cleared from the address bar on open).

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
