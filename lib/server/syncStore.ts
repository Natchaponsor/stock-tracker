// Server-side storage for encrypted sync blobs. The server never sees the sync
// code or the encryption key: it stores one opaque blob per sync id, plus the
// SHA-256 hash of the write token that first created it.
//
// Backends:
//   - Upstash Redis over its REST API (plain fetch, no SDK) when
//     KV_REST_API_URL/KV_REST_API_TOKEN (Vercel Marketplace names) or
//     UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are set. One hash per id
//     (`sync:<id>`) with fields version, iv, ciphertext, tokenHash; writes are a
//     single Lua EVAL so the compare-and-set is atomic.
//   - Otherwise, outside production, an in-memory Map on globalThis (survives
//     dev hot reloads, lost on restart).
//   - Otherwise (production without Redis) `isConfigured()` is false and the
//     route answers 503.

export interface SyncBlob {
  version: number;
  iv: string;
  ciphertext: string;
}

export interface PutInput {
  /** The version this write is based on: 0 for the first write. */
  baseVersion: number;
  iv: string;
  ciphertext: string;
}

export type PutResult =
  | { status: "ok"; version: number }
  | { status: "conflict"; current: SyncBlob }
  | { status: "unauthorized" }
  /** No blob exists (never created, or deleted) and `baseVersion` wasn't 0. */
  | { status: "missing" };

export type DeleteResult = { status: "ok" } | { status: "unauthorized" };

interface SyncBackend {
  get(id: string): Promise<SyncBlob | null>;
  put(id: string, input: PutInput, tokenHash: string): Promise<PutResult>;
  delete(id: string, tokenHash: string): Promise<DeleteResult>;
}

// ---------------------------------------------------------------------------
// In-memory backend (development and tests)

interface StoredRecord extends SyncBlob {
  tokenHash: string;
}

const MEMORY_KEY = Symbol.for("stock-tracker.syncStore.memory");

function memoryMap(): Map<string, StoredRecord> {
  const g = globalThis as typeof globalThis & { [MEMORY_KEY]?: Map<string, StoredRecord> };
  return (g[MEMORY_KEY] ??= new Map());
}

// Every method does its read-check-write without awaiting in between, so each
// call is atomic on the single JS thread.
const memoryBackend: SyncBackend = {
  async get(id) {
    const rec = memoryMap().get(id);
    return rec ? { version: rec.version, iv: rec.iv, ciphertext: rec.ciphertext } : null;
  },
  async put(id, { baseVersion, iv, ciphertext }, tokenHash) {
    const map = memoryMap();
    const rec = map.get(id);
    if (!rec) {
      if (baseVersion !== 0) return { status: "missing" };
      map.set(id, { version: 1, iv, ciphertext, tokenHash });
      return { status: "ok", version: 1 };
    }
    if (rec.tokenHash !== tokenHash) return { status: "unauthorized" };
    if (rec.version !== baseVersion) {
      return { status: "conflict", current: { version: rec.version, iv: rec.iv, ciphertext: rec.ciphertext } };
    }
    const version = rec.version + 1;
    map.set(id, { version, iv, ciphertext, tokenHash });
    return { status: "ok", version };
  },
  async delete(id, tokenHash) {
    const map = memoryMap();
    const rec = map.get(id);
    if (!rec) return { status: "ok" };
    if (rec.tokenHash !== tokenHash) return { status: "unauthorized" };
    map.delete(id);
    return { status: "ok" };
  },
};

// ---------------------------------------------------------------------------
// Upstash Redis backend (production)

const PUT_SCRIPT = `
local cur = redis.call('HMGET', KEYS[1], 'version', 'tokenHash', 'iv', 'ciphertext')
local base = tonumber(ARGV[1])
if not cur[1] then
  if base ~= 0 then return {'missing'} end
  redis.call('HSET', KEYS[1], 'version', 1, 'iv', ARGV[2], 'ciphertext', ARGV[3], 'tokenHash', ARGV[4])
  return {'ok', '1'}
end
if cur[2] ~= ARGV[4] then return {'unauthorized'} end
local v = tonumber(cur[1])
if v ~= base then return {'conflict', tostring(v), cur[3], cur[4]} end
redis.call('HSET', KEYS[1], 'version', v + 1, 'iv', ARGV[2], 'ciphertext', ARGV[3])
return {'ok', tostring(v + 1)}
`;

const DELETE_SCRIPT = `
local th = redis.call('HGET', KEYS[1], 'tokenHash')
if not th then return 'ok' end
if th ~= ARGV[1] then return 'unauthorized' end
redis.call('DEL', KEYS[1])
return 'ok'
`;

interface RedisConfig {
  url: string;
  token: string;
}

function redisConfig(): RedisConfig | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

const redisKey = (id: string) => `sync:${id}`;

async function redisCommand(config: RedisConfig, command: (string | number)[]): Promise<unknown> {
  const res = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null;
  if (!res.ok || !data || data.error) {
    throw new Error(`Upstash ${command[0]} failed: ${data?.error ?? `HTTP ${res.status}`}`);
  }
  return data.result;
}

function redisBackend(config: RedisConfig): SyncBackend {
  return {
    async get(id) {
      const result = await redisCommand(config, ["HMGET", redisKey(id), "version", "iv", "ciphertext"]);
      const [version, iv, ciphertext] = (result ?? []) as (string | null)[];
      if (version == null || iv == null || ciphertext == null) return null;
      return { version: Number(version), iv, ciphertext };
    },
    async put(id, { baseVersion, iv, ciphertext }, tokenHash) {
      const result = (await redisCommand(config, [
        "EVAL", PUT_SCRIPT, 1, redisKey(id), String(baseVersion), iv, ciphertext, tokenHash,
      ])) as string[];
      switch (result?.[0]) {
        case "ok":
          return { status: "ok", version: Number(result[1]) };
        case "conflict":
          return { status: "conflict", current: { version: Number(result[1]), iv: result[2], ciphertext: result[3] } };
        case "unauthorized":
          return { status: "unauthorized" };
        case "missing":
          return { status: "missing" };
        default:
          throw new Error(`Unexpected Upstash reply: ${JSON.stringify(result)}`);
      }
    },
    async delete(id, tokenHash) {
      const result = await redisCommand(config, ["EVAL", DELETE_SCRIPT, 1, redisKey(id), tokenHash]);
      if (result === "ok") return { status: "ok" };
      if (result === "unauthorized") return { status: "unauthorized" };
      throw new Error(`Unexpected Upstash reply: ${JSON.stringify(result)}`);
    },
  };
}

// ---------------------------------------------------------------------------
// Public API. The backend is picked on every call so env changes (and tests
// stubbing env) take effect without a restart.

function backend(): SyncBackend {
  const config = redisConfig();
  if (config) return redisBackend(config);
  if (process.env.NODE_ENV !== "production") return memoryBackend;
  throw new Error("Sync storage is not configured");
}

/** False in production when no Redis credentials are set; the route then returns 503. */
export function isConfigured(): boolean {
  return redisConfig() !== null || process.env.NODE_ENV !== "production";
}

/** The current blob for `id`, or null if there is none. */
export async function getBlob(id: string): Promise<SyncBlob | null> {
  return backend().get(id);
}

/**
 * Atomic compare-and-set. The first write must have `baseVersion` 0 and
 * registers `tokenHash`; later writes must present the same hash and the
 * current version, and bump it by one.
 */
export async function putBlob(id: string, input: PutInput, tokenHash: string): Promise<PutResult> {
  return backend().put(id, input, tokenHash);
}

/** Deletes the blob if `tokenHash` matches. Deleting a blob that doesn't exist is "ok". */
export async function deleteBlob(id: string, tokenHash: string): Promise<DeleteResult> {
  return backend().delete(id, tokenHash);
}
