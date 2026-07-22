"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePositionStore } from "@/store/usePositionStore";
import { useQuotes } from "@/hooks/useQuotes";
import type { Position } from "@/lib/types";

export function JournalTimeline({ position }: { position: Position }) {
  const addNote = usePositionStore((s) => s.addNote);
  const { quotes } = useQuotes([position.symbol]);
  const [draft, setDraft] = useState("");

  const notes = [...position.notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    addNote(position.id, {
      id: `note-${Date.now()}`,
      date: new Date().toISOString(),
      text,
      priceAtNote: quotes.get(position.symbol)?.price ?? null,
    });
    setDraft("");
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Journal</CardTitle>
          <CardSubtitle>Periodic check-ins, not a one-time reflection</CardSubtitle>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Still above both EMAs, thesis intact…"
          rows={2}
          className="flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <Button type="submit" variant="secondary" size="sm" className="sm:mt-0">
          Add note
        </Button>
      </form>

      {notes.length === 0 ? (
        <EmptyState title="No check-ins yet" />
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id} className="grid grid-cols-[84px_1fr] gap-3 py-2.5 text-sm first:pt-0">
              <span className="pt-0.5 text-xs tabular-nums text-fg-subtle">
                {format(new Date(note.date), "MMM d")}
              </span>
              <div>
                <p className="leading-relaxed text-fg-muted">{note.text}</p>
                {note.priceAtNote !== null && (
                  <p className="mt-0.5 text-xs tabular-nums text-fg-subtle">${note.priceAtNote.toFixed(2)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
