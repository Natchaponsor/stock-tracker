// Server-side storage for FX push subscriptions (opt-in). One record per push
// id: the browser's push subscription, each alert's pair/level/repeat/state, what
// was already pushed, and the SHA-256 hash of the write token that created it.
// The push id is random and unrelated to the sync id; nothing here links a
// record to a book.
//
// Backends: Upstash Redis over REST when configured (same env as device sync),
// else an in-memory Map outside production.

import type { FxPushAlert } from "@/lib/fxPushPlan";

export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface FxPushRecord {
  tokenHash: string;
  subscription: PushSubscriptionJson;
  alerts: FxPushAlert[];
  sent: Record<string, string>;
  updatedAt: string;
}

export type SaveResult = { status: "ok" } | { status: "unauthorized" };

interface Backend {
  get(id: string): Promise<FxPushRecord | null>;
  set(id: string, record: FxPushRecord): Promise<void>;
  delete(id: string): Promise<void>;
  ids(): Promise<string[]>;
}

// ── In memory (development and tests) ──

const MEMORY_KEY = Symbol.for("stock-tracker.fxPushStore.memory");

function memoryMap(): Map<string, FxPushRecord> {
  const g = globalThis as typeof globalThis & { [MEMORY_KEY]?: Map<string, FxPushRecord> };
  return (g[MEMORY_KEY] ??= new Map());
}

const memoryBackend: Backend = {
  async get(id) {
    return memoryMap().get(id) ?? null;
  },
  async set(id, record) {
    memoryMap().set(id, record);
  },
  async delete(id) {
    memoryMap().delete(id);
  },
  async ids() {
    return Array.from(memoryMap().keys());
  },
};

// ── Upstash Redis ──

interface RedisConfig {
  url: string;
  token: string;
}

function redisConfig(): RedisConfig | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

const recordKey = (id: string) => `fxpush:${id}`;
const INDEX_KEY = "fxpush:ids";

async function redis(config: RedisConfig, command: (string | number)[]): Promise<unknown> {
  const res = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null;
  if (!res.ok || !data || data.error) throw new Error(`Upstash ${command[0]} failed: ${data?.error ?? `HTTP ${res.status}`}`);
  return data.result;
}

function redisBackend(config: RedisConfig): Backend {
  return {
    async get(id) {
      const raw = (await redis(config, ["GET", recordKey(id)])) as string | null;
      return raw ? (JSON.parse(raw) as FxPushRecord) : null;
    },
    async set(id, record) {
      await redis(config, ["SET", recordKey(id), JSON.stringify(record)]);
      await redis(config, ["SADD", INDEX_KEY, id]);
    },
    async delete(id) {
      await redis(config, ["DEL", recordKey(id)]);
      await redis(config, ["SREM", INDEX_KEY, id]);
    },
    async ids() {
      return ((await redis(config, ["SMEMBERS", INDEX_KEY])) as string[] | null) ?? [];
    },
  };
}

function backend(): Backend {
  const config = redisConfig();
  if (config) return redisBackend(config);
  if (process.env.NODE_ENV !== "production") return memoryBackend;
  throw new Error("Push storage is not configured");
}

/** Push needs storage and VAPID keys. */
export function isPushConfigured(): boolean {
  const storage = redisConfig() !== null || process.env.NODE_ENV !== "production";
  return storage && Boolean(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

/**
 * Creates or replaces a device's record. The first write registers `tokenHash`;
 * later writes must present the same one. `sent` survives a replace, so
 * re-uploading alerts doesn't re-push what was already pushed.
 */
export async function saveRecord(
  id: string,
  tokenHash: string,
  input: { subscription: PushSubscriptionJson; alerts: FxPushAlert[] }
): Promise<SaveResult> {
  const b = backend();
  const existing = await b.get(id);
  if (existing && existing.tokenHash !== tokenHash) return { status: "unauthorized" };
  await b.set(id, {
    tokenHash,
    subscription: input.subscription,
    alerts: input.alerts,
    sent: existing?.sent ?? {},
    updatedAt: new Date().toISOString(),
  });
  return { status: "ok" };
}

export async function deleteRecord(id: string, tokenHash: string): Promise<SaveResult> {
  const b = backend();
  const existing = await b.get(id);
  if (!existing) return { status: "ok" };
  if (existing.tokenHash !== tokenHash) return { status: "unauthorized" };
  await b.delete(id);
  return { status: "ok" };
}

/** For the daily check. */
export async function listRecords(): Promise<[string, FxPushRecord][]> {
  const b = backend();
  const ids = await b.ids();
  const records = await Promise.all(ids.map(async (id) => [id, await b.get(id)] as const));
  return records.filter((r): r is [string, FxPushRecord] => r[1] !== null);
}

export async function updateSent(id: string, sent: Record<string, string>): Promise<void> {
  const b = backend();
  const existing = await b.get(id);
  if (existing) await b.set(id, { ...existing, sent });
}

/** Drops a record without a token check: the push service said the subscription is gone. */
export async function dropRecord(id: string): Promise<void> {
  await backend().delete(id);
}
