import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteBlob, getBlob, isConfigured, putBlob } from "../server/syncStore";

const REDIS_VARS = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];

let n = 0;
/** A fresh 32-hex id per test so the shared in-memory map never leaks state between tests. */
const freshId = () => (Date.now().toString(16) + (++n).toString(16)).padStart(32, "0");

const TOKEN_A = "a".repeat(64);
const TOKEN_B = "b".repeat(64);
const blob = (tag: string) => ({ iv: "AAAAAAAAAAAAAAAA", ciphertext: `${tag}==` });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("in-memory sync store", () => {
  beforeEach(() => {
    for (const name of REDIS_VARS) vi.stubEnv(name, "");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("is configured outside production", () => {
    expect(isConfigured()).toBe(true);
  });

  it("returns null for an unknown id", async () => {
    expect(await getBlob(freshId())).toBeNull();
  });

  it("creates the blob at version 1 on the first write", async () => {
    const id = freshId();
    expect(await putBlob(id, { baseVersion: 0, ...blob("one") }, TOKEN_A)).toEqual({ status: "ok", version: 1 });
    expect(await getBlob(id)).toEqual({ version: 1, ...blob("one") });
  });

  it("refuses a first write that isn't based on version 0", async () => {
    const id = freshId();
    expect(await putBlob(id, { baseVersion: 3, ...blob("one") }, TOKEN_A)).toEqual({ status: "missing" });
    expect(await getBlob(id)).toBeNull();
  });

  it("increments the version on each write based on the current one", async () => {
    const id = freshId();
    await putBlob(id, { baseVersion: 0, ...blob("one") }, TOKEN_A);
    expect(await putBlob(id, { baseVersion: 1, ...blob("two") }, TOKEN_A)).toEqual({ status: "ok", version: 2 });
    expect(await putBlob(id, { baseVersion: 2, ...blob("three") }, TOKEN_A)).toEqual({ status: "ok", version: 3 });
    expect(await getBlob(id)).toEqual({ version: 3, ...blob("three") });
  });

  it("returns a conflict with the current blob on a stale baseVersion", async () => {
    const id = freshId();
    await putBlob(id, { baseVersion: 0, ...blob("one") }, TOKEN_A);
    await putBlob(id, { baseVersion: 1, ...blob("two") }, TOKEN_A);
    expect(await putBlob(id, { baseVersion: 1, ...blob("stale") }, TOKEN_A)).toEqual({
      status: "conflict",
      current: { version: 2, ...blob("two") },
    });
    // A second "first write" is a conflict too, so a new device can't clobber the book.
    expect(await putBlob(id, { baseVersion: 0, ...blob("fresh") }, TOKEN_A)).toMatchObject({ status: "conflict" });
    expect(await getBlob(id)).toEqual({ version: 2, ...blob("two") });
  });

  it("refuses writes with a different token", async () => {
    const id = freshId();
    await putBlob(id, { baseVersion: 0, ...blob("one") }, TOKEN_A);
    expect(await putBlob(id, { baseVersion: 1, ...blob("evil") }, TOKEN_B)).toEqual({ status: "unauthorized" });
    // Wrong token is refused before the version is even compared.
    expect(await putBlob(id, { baseVersion: 0, ...blob("evil") }, TOKEN_B)).toEqual({ status: "unauthorized" });
    expect(await getBlob(id)).toEqual({ version: 1, ...blob("one") });
  });

  it("deletes only with the right token", async () => {
    const id = freshId();
    await putBlob(id, { baseVersion: 0, ...blob("one") }, TOKEN_A);
    expect(await deleteBlob(id, TOKEN_B)).toEqual({ status: "unauthorized" });
    expect(await getBlob(id)).not.toBeNull();
    expect(await deleteBlob(id, TOKEN_A)).toEqual({ status: "ok" });
    expect(await getBlob(id)).toBeNull();
    // Deleting again is a no-op, and a stale device can't resurrect it with an old version.
    expect(await deleteBlob(id, TOKEN_A)).toEqual({ status: "ok" });
    expect(await putBlob(id, { baseVersion: 1, ...blob("stale") }, TOKEN_A)).toEqual({ status: "missing" });
    // Turning sync on again starts over at version 1.
    expect(await putBlob(id, { baseVersion: 0, ...blob("again") }, TOKEN_B)).toEqual({ status: "ok", version: 1 });
  });

  it("is not configured in production without Redis", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isConfigured()).toBe(false);
    await expect(getBlob(freshId())).rejects.toThrow(/not configured/);
  });
});

describe("Upstash Redis sync store (request shape)", () => {
  const calls: { url: string; init: RequestInit }[] = [];
  let reply: unknown;

  beforeEach(() => {
    calls.length = 0;
    for (const name of REDIS_VARS) vi.stubEnv(name, "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "upstash-token");
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return Response.json({ result: reply });
    });
  });

  const lastCommand = () => JSON.parse(calls.at(-1)!.init.body as string) as unknown[];

  it("is configured from either env var pair, preferring KV_*", async () => {
    expect(isConfigured()).toBe(true);
    vi.stubEnv("KV_REST_API_URL", "https://kv.example.io");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    reply = [null, null, null];
    await getBlob("0".repeat(32));
    expect(calls[0].url).toBe("https://kv.example.io");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer kv-token");
  });

  it("reads one hash per id", async () => {
    reply = ["4", "IV", "CT"];
    expect(await getBlob("f".repeat(32))).toEqual({ version: 4, iv: "IV", ciphertext: "CT" });
    expect(calls[0].url).toBe("https://example.upstash.io");
    expect(lastCommand()).toEqual(["HMGET", `sync:${"f".repeat(32)}`, "version", "iv", "ciphertext"]);
    reply = [null, null, null];
    expect(await getBlob("f".repeat(32))).toBeNull();
  });

  it("writes with a single EVAL and maps every reply", async () => {
    const id = "e".repeat(32);
    reply = ["ok", "2"];
    expect(await putBlob(id, { baseVersion: 1, iv: "IV", ciphertext: "CT" }, "hash")).toEqual({
      status: "ok",
      version: 2,
    });
    const cmd = lastCommand();
    expect(cmd[0]).toBe("EVAL");
    expect(cmd.slice(2)).toEqual([1, `sync:${id}`, "1", "IV", "CT", "hash"]);

    reply = ["conflict", "5", "IV5", "CT5"];
    expect(await putBlob(id, { baseVersion: 1, iv: "IV", ciphertext: "CT" }, "hash")).toEqual({
      status: "conflict",
      current: { version: 5, iv: "IV5", ciphertext: "CT5" },
    });
    reply = ["unauthorized"];
    expect(await putBlob(id, { baseVersion: 1, iv: "IV", ciphertext: "CT" }, "hash")).toEqual({ status: "unauthorized" });
    reply = ["missing"];
    expect(await putBlob(id, { baseVersion: 1, iv: "IV", ciphertext: "CT" }, "hash")).toEqual({ status: "missing" });
  });

  it("deletes with a single EVAL", async () => {
    reply = "ok";
    expect(await deleteBlob("d".repeat(32), "hash")).toEqual({ status: "ok" });
    expect(lastCommand().slice(2)).toEqual([1, `sync:${"d".repeat(32)}`, "hash"]);
    reply = "unauthorized";
    expect(await deleteBlob("d".repeat(32), "hash")).toEqual({ status: "unauthorized" });
  });

  it("throws when Upstash reports an error", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "WRONGPASS" }, { status: 401 }));
    await expect(getBlob("0".repeat(32))).rejects.toThrow(/WRONGPASS/);
  });
});
