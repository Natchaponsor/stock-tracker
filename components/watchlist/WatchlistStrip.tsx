"use client";

import { useState } from "react";
import { MotionConfig, Reorder, useDragControls } from "framer-motion";
import { GripVertical, Plus } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { WatchlistCard } from "./WatchlistCard";
import { NsEmpty } from "@/components/navy/primitives";
import { MAX_WATCHLIST_SYMBOLS } from "@/lib/constants";
import { moveKey } from "@/lib/reorder";
import { cn } from "@/lib/cn";
import type { WatchlistItem } from "@/lib/types";

/**
 * One draggable watchlist row. Dragging starts only from the grip, so pressing
 * the symbol (a link when held) or the remove button never turns into a drag.
 * The grip also answers ↑/↓ for keyboard and screen-reader users.
 */
function WatchRow({
  item,
  position,
  count,
  onMove,
}: {
  item: WatchlistItem;
  position: number;
  count: number;
  onMove: (symbol: string, delta: number) => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);

  return (
    <Reorder.Item
      as="div"
      value={item.symbol}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "relative border-b border-ns-line bg-ns-card last:border-b-0",
        dragging && "z-10 rounded-ns-md border-transparent px-2 shadow-ns-card"
      )}
    >
      <WatchlistCard
        item={item}
        handle={
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              controls.start(e);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                onMove(item.symbol, e.key === "ArrowUp" ? -1 : 1);
              }
            }}
            title="Drag to reorder"
            aria-label={`Reorder ${item.symbol}, position ${position} of ${count}. Use the up and down arrow keys to move it.`}
            className={cn(
              "flex h-8 w-5 shrink-0 touch-none items-center justify-center text-ns-ink-subtle transition-colors hover:text-ns-ink",
              dragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </Reorder.Item>
  );
}

export function WatchlistStrip() {
  const watchlist = usePositionStore((s) => s.watchlist);
  const addWatchlistSymbol = usePositionStore((s) => s.addWatchlistSymbol);
  const reorderWatchlist = usePositionStore((s) => s.reorderWatchlist);
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const symbols = watchlist.map((w) => w.symbol);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const symbol = draft.trim().toUpperCase();
    if (!symbol || watchlist.length >= MAX_WATCHLIST_SYMBOLS) return;
    addWatchlistSymbol(symbol);
    setDraft("");
  }

  function moveByKeyboard(symbol: string, delta: number) {
    const next = moveKey(symbols, symbol, delta);
    if (next === symbols) return;
    reorderWatchlist(next);
    setAnnouncement(`${symbol} moved to position ${next.indexOf(symbol) + 1} of ${next.length}.`);
  }

  return (
    <div>
      {watchlist.length === 0 ? (
        <NsEmpty
          title="Nothing on watch"
          description="Add a symbol to keep it on the sheet without holding any of it."
        />
      ) : (
        // "user" honours prefers-reduced-motion: rows still reorder, they just
        // jump into place instead of sliding.
        <MotionConfig reducedMotion="user">
          <Reorder.Group as="div" axis="y" values={symbols} onReorder={reorderWatchlist}>
            {watchlist.map((item, i) => (
              <WatchRow
                key={item.symbol}
                item={item}
                position={i + 1}
                count={watchlist.length}
                onMove={moveByKeyboard}
              />
            ))}
          </Reorder.Group>
        </MotionConfig>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {watchlist.length < MAX_WATCHLIST_SYMBOLS && (
        <form onSubmit={handleAdd} className="mt-3 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add symbol (e.g. MSFT)"
            aria-label="Add a symbol to the watchlist"
            className="ns-body h-11 min-w-0 flex-1 rounded-ns-md border border-ns-line bg-ns-card px-3.5 text-ns-ink placeholder:text-ns-ink-subtle focus-visible:border-ns-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ns-primary-soft"
          />
          <button type="submit" className="oc-btn oc-btn-secondary h-11 px-4! py-0!">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      )}
    </div>
  );
}
