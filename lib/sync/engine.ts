import { mergeBooks, normalizeSyncBook, sameBook, type SyncBook } from "./book";
import { decryptBook, deriveSyncKeys, encryptBook, generateSyncCode, normalizeSyncCode, type SyncKeys } from "./crypto";

/**
 * Device sync. Each device keeps its full book locally (as before); while sync
 * is on, the engine keeps an encrypted copy on the server in step with it:
 *
 * - push: a local change marks the book dirty; shortly after, the book is
 *   encrypted and written with the version it was based on. A 409 means another
 *   device wrote first: pull theirs, merge, write again.
 * - pull: on open, on return to the app, on reconnect, every minute while
 *   visible, and on Sync now / Refresh. A newer server copy is decrypted,
 *   merged into the local book and applied.
 *
 * Merging (lib/sync/book.ts) is item by item, so edits on two devices before
 * they sync both survive unless they touched the same item.
 */

/** Where the engine reads and writes the local book (the zustand store in the app). */
export interface BookPort {
  get(): SyncBook;
  apply(book: SyncBook): void;
}

/** A small persistent key-value store (localStorage in the app). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SyncConfig {
  code: string;
  /** The server version this device's book was last in step with. */
  version: number;
  /** Local changes not yet written to the server. */
  dirty: boolean;
  lastSyncedAt: string | null;
}

export type SyncState =
  | "off" // no code on this device
  | "syncing"
  | "synced"
  | "offline" // couldn't reach the server; local changes wait
  | "removed" // the synced copy was deleted (from another device)
  | "unavailable" // the server has no sync storage configured
  | "error";

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: string | null;
  /** Local changes waiting to be written. */
  pending: boolean;
  message: string | null;
}

/** The plaintext inside the encrypted blob. `schema` lets the format change later. */
interface SyncEnvelope {
  schema: 1;
  book: SyncBook;
}

export type PairMode = "replace" | "merge";

export class SyncError extends Error {}

export const SYNC_CONFIG_KEY = "stock-tracker-sync";
const MAX_CONFLICT_RETRIES = 3;

function isSyncBook(value: unknown): value is SyncBook {
  if (!value || typeof value !== "object") return false;
  const b = value as Record<string, unknown>;
  return (
    Array.isArray(b.positions) &&
    Array.isArray(b.strategies) &&
    Array.isArray(b.watchlist) &&
    Array.isArray(b.customSectors) &&
    typeof b.startingCash === "number" &&
    typeof b.deletions === "object" &&
    b.deletions !== null
  );
}

export interface SyncEngineDeps {
  book: BookPort;
  storage: KeyValueStore;
  fetch?: typeof fetch;
  apiBase?: string;
  now?: () => Date;
}

export class SyncEngine {
  private readonly book: BookPort;
  private readonly storage: KeyValueStore;
  private readonly fetchFn: typeof fetch;
  private readonly apiBase: string;
  private readonly now: () => Date;

  private keys: { code: string; keys: SyncKeys } | null = null;
  private running: Promise<void> | null = null;
  private rerun = false;
  /** Bumped on every local change, so a change made mid-sync is never marked as synced. */
  private changeSeq = 0;
  private status: SyncStatus;
  private readonly listeners = new Set<() => void>();

  constructor(deps: SyncEngineDeps) {
    this.book = deps.book;
    this.storage = deps.storage;
    this.fetchFn = deps.fetch ?? ((...args) => fetch(...args));
    this.apiBase = deps.apiBase ?? "/api/sync";
    this.now = deps.now ?? (() => new Date());
    const config = this.readConfig();
    this.status = {
      state: config ? "synced" : "off",
      lastSyncedAt: config?.lastSyncedAt ?? null,
      pending: config?.dirty ?? false,
      message: null,
    };
  }

  // ── Status ────────────────────────────────────────────────────────────────

  getStatus = (): SyncStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setStatus(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  /** The sync code, for the QR and "show code" (null when sync is off). */
  getCode(): string | null {
    return this.readConfig()?.code ?? null;
  }

  isOn(): boolean {
    return this.readConfig() !== null;
  }

  // ── Config ────────────────────────────────────────────────────────────────

  private readConfig(): SyncConfig | null {
    try {
      const raw = this.storage.getItem(SYNC_CONFIG_KEY);
      if (!raw) return null;
      const config = JSON.parse(raw) as SyncConfig;
      return normalizeSyncCode(config.code) ? config : null;
    } catch {
      return null;
    }
  }

  private writeConfig(config: SyncConfig | null) {
    if (config) this.storage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
    else this.storage.removeItem(SYNC_CONFIG_KEY);
  }

  private updateConfig(patch: Partial<SyncConfig>) {
    const config = this.readConfig();
    if (config) this.writeConfig({ ...config, ...patch });
  }

  private async keysFor(code: string): Promise<SyncKeys> {
    if (this.keys?.code !== code) this.keys = { code, keys: await deriveSyncKeys(code) };
    return this.keys.keys;
  }

  // ── Server calls ──────────────────────────────────────────────────────────

  private async getRemote(keys: SyncKeys): Promise<{ version: number; book: SyncBook } | null> {
    const res = await this.fetchFn(`${this.apiBase}/${keys.syncId}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (res.status === 503) throw new SyncError("unavailable");
    if (!res.ok) throw new SyncError(`Sync server error (${res.status})`);
    const blob = (await res.json()) as { version: number; iv: string; ciphertext: string };
    return { version: blob.version, book: await this.open(keys, blob) };
  }

  private async open(keys: SyncKeys, blob: { iv: string; ciphertext: string }): Promise<SyncBook> {
    let envelope: SyncEnvelope;
    try {
      envelope = (await decryptBook(keys.encKey, blob)) as SyncEnvelope;
    } catch {
      throw new SyncError("This code doesn't match the synced book.");
    }
    if (envelope?.schema !== 1 || !isSyncBook(envelope.book)) {
      throw new SyncError("The synced book is from a newer version of the app. Reload to update.");
    }
    // A book written by a device that predates FX has no FX collections yet.
    return normalizeSyncBook(envelope.book);
  }

  /** Writes `book` on top of `baseVersion`. Returns the new version, or the newer server copy on a conflict. */
  private async putRemote(
    keys: SyncKeys,
    baseVersion: number,
    book: SyncBook
  ): Promise<{ ok: true; version: number } | { ok: false; version: number; book: SyncBook } | null> {
    const envelope: SyncEnvelope = { schema: 1, book };
    const blob = await encryptBook(keys.encKey, envelope);
    const res = await this.fetchFn(`${this.apiBase}/${keys.syncId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${keys.writeToken}` },
      body: JSON.stringify({ baseVersion, ...blob }),
    });
    if (res.status === 404) return null;
    if (res.status === 503) throw new SyncError("unavailable");
    if (res.status === 409) {
      const current = (await res.json()) as { version: number; iv: string; ciphertext: string };
      return { ok: false, version: current.version, book: await this.open(keys, current) };
    }
    if (res.status === 413) throw new SyncError("The book is too large to sync.");
    if (!res.ok) throw new SyncError(`Sync server error (${res.status})`);
    const { version } = (await res.json()) as { version: number };
    return { ok: true, version };
  }

  // ── Public actions ────────────────────────────────────────────────────────

  /** Turns sync on with a new code and uploads this device's book as the first version. */
  async enable(): Promise<string> {
    const code = generateSyncCode();
    const keys = await this.keysFor(code);
    const result = await this.putRemote(keys, 0, this.book.get());
    if (!result?.ok) throw new SyncError("Couldn't create the synced book. Try again.");
    const syncedAt = this.now().toISOString();
    this.writeConfig({ code, version: result.version, dirty: false, lastSyncedAt: syncedAt });
    this.setStatus({ state: "synced", lastSyncedAt: syncedAt, pending: false, message: null });
    return code;
  }

  /**
   * Joins an existing synced book. "replace" swaps this device's book for the
   * synced one; "merge" combines both and writes the result back.
   */
  async pair(input: string, mode: PairMode): Promise<void> {
    const code = normalizeSyncCode(input);
    if (!code) throw new SyncError("That isn't a valid sync code.");
    const keys = await this.keysFor(code);
    const remote = await this.getRemote(keys);
    if (!remote) throw new SyncError("No synced book uses this code. Check it, or turn sync on from the other device.");

    const book = mode === "replace" ? remote.book : mergeBooks(this.book.get(), remote.book, this.now().getTime());
    this.applyIfChanged(book);
    const dirty = mode === "merge" && !sameBook(book, remote.book);
    this.writeConfig({ code, version: remote.version, dirty, lastSyncedAt: this.now().toISOString() });
    this.setStatus({ state: "synced", lastSyncedAt: this.now().toISOString(), pending: dirty, message: null });
    if (dirty) await this.sync();
  }

  /** Stops syncing on this device. Its book stays; the synced copy stays for other devices. */
  disable() {
    this.writeConfig(null);
    this.keys = null;
    this.setStatus({ state: "off", lastSyncedAt: null, pending: false, message: null });
  }

  /** Deletes the synced copy from the server (other devices stop syncing) and turns sync off here. */
  async deleteRemote(): Promise<void> {
    const config = this.readConfig();
    if (!config) return;
    const keys = await this.keysFor(config.code);
    const res = await this.fetchFn(`${this.apiBase}/${keys.syncId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${keys.writeToken}` },
    });
    if (!res.ok && res.status !== 404) throw new SyncError(`Couldn't delete the synced copy (${res.status}).`);
    this.disable();
  }

  /** A synced field changed locally: remember it so it survives a reload, then sync. */
  markChanged() {
    const config = this.readConfig();
    if (!config) return;
    this.changeSeq += 1;
    if (this.running) this.rerun = true;
    if (!config.dirty) this.updateConfig({ dirty: true });
    this.setStatus({ pending: true });
  }

  /** Applies a merged book only if it differs, so an unchanged pull doesn't re-render the app. */
  private applyIfChanged(book: SyncBook) {
    if (!sameBook(book, this.book.get())) this.book.apply(book);
  }

  /** Pulls, merges and pushes until this device and the server agree. Safe to call often. */
  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    this.running = this.runSync().finally(() => {
      this.running = null;
      if (this.rerun) {
        this.rerun = false;
        void this.sync();
      }
    });
    return this.running;
  }

  private async runSync(): Promise<void> {
    const config = this.readConfig();
    if (!config) return;
    this.setStatus({ state: "syncing", message: null });
    try {
      const keys = await this.keysFor(config.code);
      let version = config.version;
      let dirty = config.dirty;

      const remote = await this.getRemote(keys);
      if (!remote) {
        this.setStatus({ state: "removed", message: "The synced copy was deleted from another device." });
        return;
      }
      if (remote.version > version) {
        const merged = mergeBooks(this.book.get(), remote.book, this.now().getTime());
        this.applyIfChanged(merged);
        version = remote.version;
        dirty = !sameBook(merged, remote.book);
        this.updateConfig({ version, dirty });
      }

      for (let attempt = 0; dirty && attempt <= MAX_CONFLICT_RETRIES; attempt++) {
        const seqAtPut = this.changeSeq;
        const result = await this.putRemote(keys, version, this.book.get());
        if (!result) {
          this.setStatus({ state: "removed", message: "The synced copy was deleted from another device." });
          return;
        }
        if (result.ok) {
          version = result.version;
          // An edit made while this write was in flight still needs its own write.
          dirty = this.changeSeq !== seqAtPut;
        } else {
          // Another device wrote first: take theirs into account and try again.
          const merged = mergeBooks(this.book.get(), result.book, this.now().getTime());
          this.applyIfChanged(merged);
          version = result.version;
          dirty = !sameBook(merged, result.book);
        }
        this.updateConfig({ version, dirty });
      }

      const syncedAt = this.now().toISOString();
      this.updateConfig({ lastSyncedAt: syncedAt });
      this.setStatus({ state: "synced", lastSyncedAt: syncedAt, pending: dirty, message: null });
    } catch (err) {
      if (err instanceof SyncError && err.message === "unavailable") {
        this.setStatus({ state: "unavailable", message: "Sync isn't set up on this server." });
      } else if (err instanceof SyncError) {
        this.setStatus({ state: "error", message: err.message });
      } else {
        // fetch rejects on network failure: keep the changes and try again later.
        this.setStatus({ state: "offline", message: "Offline. Changes will sync when you're back online." });
      }
    }
  }
}
