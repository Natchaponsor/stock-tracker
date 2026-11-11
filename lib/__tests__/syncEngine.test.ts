import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { DELETE, GET, PUT } from "@/app/api/sync/[id]/route";
import { SyncEngine, type KeyValueStore } from "../sync/engine";
import type { SyncBook } from "../sync/book";
import type { Position } from "../types";

/** fetch that calls the real /api/sync route handlers (in-memory store outside production). */
const serverFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input), "http://test.local");
  const id = url.pathname.split("/").pop() ?? "";
  const request = new Request(url, init) as unknown as NextRequest;
  const ctx = { params: Promise.resolve({ id }) };
  const method = init?.method ?? "GET";
  if (method === "PUT") return PUT(request, ctx);
  if (method === "DELETE") return DELETE(request, ctx);
  return GET(request, ctx);
};

const T = (minute: number) => new Date(Date.UTC(2026, 10, 11, 12, minute)).toISOString();

function position(id: string, updatedAt: string, overrides: Partial<Position> = {}): Position {
  return {
    id,
    symbol: "AAPL",
    status: "open",
    strategyIds: [],
    customTags: [],
    thesis: "",
    stop: null,
    target: null,
    entries: [{ id: `${id}-e1`, date: T(0), price: 100, qty: 10 }],
    exits: [],
    notes: [],
    isSeed: false,
    createdAt: T(0),
    updatedAt,
    ...overrides,
  };
}

function emptyBook(overrides: Partial<SyncBook> = {}): SyncBook {
  return {
    positions: [],
    strategies: [],
    watchlist: [],
    customSectors: [],
    startingCash: 10_000,
    startingCashUpdatedAt: null,
    watchlistOrderUpdatedAt: null,
    deletions: {},
    ...overrides,
  };
}

/** One simulated device: its own book, its own storage, the shared server. */
function device(initial: SyncBook, fetchFn: typeof fetch = serverFetch) {
  let book = initial;
  const items = new Map<string, string>();
  const storage: KeyValueStore = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
  const engine = new SyncEngine({
    book: { get: () => book, apply: (next) => void (book = next) },
    storage,
    fetch: fetchFn,
    now: () => new Date(Date.UTC(2026, 10, 11, 13)),
  });
  return {
    engine,
    get book() {
      return book;
    },
    /** A local edit, as the store subscription would report it. */
    edit(change: (b: SyncBook) => SyncBook) {
      book = change(book);
      engine.markChanged();
    },
  };
}

describe("SyncEngine", () => {
  it("pairs a second device with the synced book, replacing its demo data", async () => {
    const laptop = device(emptyBook({ positions: [position("real", T(1))], startingCash: 25_000 }));
    const phone = device(emptyBook({ positions: [position("seed-aapl-1", T(2))] }));

    const code = await laptop.engine.enable();
    await phone.engine.pair(code, "replace");

    expect(phone.book.positions.map((p) => p.id)).toEqual(["real"]);
    expect(phone.book.startingCash).toBe(25_000);
    expect(phone.engine.getStatus().state).toBe("synced");
  });

  it("merges both books when asked, and writes the result back", async () => {
    const laptop = device(emptyBook({ positions: [position("a", T(1))] }));
    const phone = device(emptyBook({ positions: [position("b", T(2))] }));
    const code = await laptop.engine.enable();

    await phone.engine.pair(code, "merge");
    await laptop.engine.sync();

    expect(laptop.book.positions.map((p) => p.id).sort()).toEqual(["a", "b"]);
    expect(phone.book.positions.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("keeps fills added on both devices before they synced", async () => {
    const laptop = device(emptyBook({ positions: [position("p", T(1))] }));
    const phone = device(emptyBook());
    const code = await laptop.engine.enable();
    await phone.engine.pair(code, "replace");

    const addExit = (id: string, minute: number) => (b: SyncBook) => ({
      ...b,
      positions: b.positions.map((p) => ({
        ...p,
        exits: [...p.exits, { id, date: T(minute), price: 120, qty: 1 }],
        updatedAt: T(minute),
      })),
    });
    laptop.edit(addExit("x-laptop", 5));
    phone.edit(addExit("x-phone", 6));

    await laptop.engine.sync();
    await phone.engine.sync();
    await laptop.engine.sync();

    expect(laptop.book.positions[0].exits.map((f) => f.id)).toEqual(["x-laptop", "x-phone"]);
    expect(phone.book).toEqual(laptop.book);
  });

  it("carries a deletion to the other device", async () => {
    const laptop = device(emptyBook({ positions: [position("p", T(1))] }));
    const phone = device(emptyBook());
    const code = await laptop.engine.enable();
    await phone.engine.pair(code, "replace");

    phone.edit((b) => ({ ...b, positions: [], deletions: { "position:p": T(10) } }));
    await phone.engine.sync();
    await laptop.engine.sync();

    expect(laptop.book.positions).toEqual([]);
  });

  it("recovers from a write conflict by merging and writing again", async () => {
    const laptop = device(emptyBook({ positions: [position("p", T(1))] }));
    const code = await laptop.engine.enable();

    // Once armed, the phone reads the server, then the laptop writes before the phone does.
    let armed = false;
    let conflicts = 0;
    const racingFetch: typeof fetch = async (input, init) => {
      const response = await serverFetch(input, init);
      if (response.status === 409) conflicts += 1;
      if (armed && (init?.method ?? "GET") === "GET") {
        armed = false;
        laptop.edit((b) => ({ ...b, startingCash: 7_000, startingCashUpdatedAt: T(20) }));
        await laptop.engine.sync();
      }
      return response;
    };
    const phone = device(emptyBook(), racingFetch);
    await phone.engine.pair(code, "replace");
    phone.edit((b) => ({ ...b, positions: [...b.positions, position("q", T(21))] }));
    armed = true;
    await phone.engine.sync();
    await laptop.engine.sync();

    expect(conflicts).toBe(1);
    expect(phone.book.startingCash).toBe(7_000);
    expect(laptop.book.positions.map((p) => p.id).sort()).toEqual(["p", "q"]);
    expect(phone.engine.getStatus()).toMatchObject({ state: "synced", pending: false });
  });

  it("rejects a code that no synced book uses", async () => {
    const phone = device(emptyBook());
    const other = device(emptyBook());
    const unusedCode = await other.engine.enable();
    await other.engine.deleteRemote();
    await expect(phone.engine.pair(unusedCode, "replace")).rejects.toThrow(/No synced book/);
    await expect(phone.engine.pair("not a code", "replace")).rejects.toThrow(/valid sync code/);
  });

  it("keeps changes while offline and sends them once back online", async () => {
    let online = true;
    const flakyFetch: typeof fetch = (input, init) =>
      online ? serverFetch(input, init) : Promise.reject(new TypeError("Failed to fetch"));
    const laptop = device(emptyBook());
    const phone = device(emptyBook(), flakyFetch);
    const code = await laptop.engine.enable();
    await phone.engine.pair(code, "replace");

    online = false;
    phone.edit((b) => ({ ...b, startingCash: 3_000, startingCashUpdatedAt: T(30) }));
    await phone.engine.sync();
    expect(phone.engine.getStatus()).toMatchObject({ state: "offline", pending: true });

    online = true;
    await phone.engine.sync();
    await laptop.engine.sync();
    expect(laptop.book.startingCash).toBe(3_000);
  });

  it("tells other devices when the synced copy was deleted", async () => {
    const laptop = device(emptyBook());
    const phone = device(emptyBook());
    const code = await laptop.engine.enable();
    await phone.engine.pair(code, "replace");

    await laptop.engine.deleteRemote();
    expect(laptop.engine.isOn()).toBe(false);
    await phone.engine.sync();
    expect(phone.engine.getStatus().state).toBe("removed");
  });
});
