"use client";

import { useState } from "react";
import { MotionConfig, Reorder, useDragControls } from "framer-motion";
import { GripVertical, Plus } from "lucide-react";
import { usePositionStore } from "@/store/usePositionStore";
import { WatchlistCard } from "./WatchlistCard";
import { EmptyEntry } from "@/components/log/Band";
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
        "relative border-b border-rule bg-bg last:border-b-0",
        dragging && "z-10 bg-panel outline outline-1 outline-rule-strong"
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
              "flex h-6 w-5 shrink-0 touch-none items-center justify-center text-fg-subtle transition-colors hover:text-fg",
              dragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <GripVertical className="h-3.5 w-3.5" />
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
        <EmptyEntry
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
        <form onSubmit={handleAdd} className="mt-4 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add symbol (e.g. MSFT)"
            aria-label="Add a symbol to the watchlist"
            className="h-8 w-44 border border-rule-strong bg-panel px-2.5 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <button
            type="submit"
            className="stamp flex h-8 items-center gap-1.5 border border-rule-strong px-2.5 text-fg-muted transition-colors hover:text-fg"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </form>
      )}
    </div>
  );
}
