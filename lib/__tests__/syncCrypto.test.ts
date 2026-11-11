import { describe, expect, it } from "vitest";
import {
  decryptBook,
  deriveSyncKeys,
  encryptBook,
  generateSyncCode,
  hashToken,
  normalizeSyncCode,
} from "../sync/crypto";

const CODE_RE = /^[A-Z2-7]{4}(-[A-Z2-7]{4}){5}-[A-Z2-7]{2}$/;

describe("sync codes", () => {
  it("generates 26 base32 chars in groups of 4", () => {
    const code = generateSyncCode();
    expect(code).toMatch(CODE_RE);
    expect(code.replace(/-/g, "")).toHaveLength(26);
  });

  it("generates a different code each time", () => {
    const codes = new Set(Array.from({ length: 50 }, generateSyncCode));
    expect(codes.size).toBe(50);
  });

  it("round-trips a generated code through normalization", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSyncCode();
      expect(normalizeSyncCode(code)).toBe(code);
    }
  });

  it("ignores case, spaces and dashes", () => {
    const code = generateSyncCode();
    const messy = ` ${code.toLowerCase().replace(/-/g, " ")} `;
    expect(normalizeSyncCode(messy)).toBe(code);
    expect(normalizeSyncCode(code.replace(/-/g, ""))).toBe(code);
    expect(normalizeSyncCode(code.replace(/-/g, "--"))).toBe(code);
  });

  it("maps 0, 1 and 8 to O, I and B", () => {
    expect(normalizeSyncCode("0018-ABCD-EFGH-IJKL-MNOP-QRST-UA")).toBe("OOIB-ABCD-EFGH-IJKL-MNOP-QRST-UA");
  });

  it("rejects wrong lengths and characters outside the alphabet", () => {
    expect(normalizeSyncCode("")).toBeNull();
    expect(normalizeSyncCode("ABCD-EFGH")).toBeNull();
    expect(normalizeSyncCode("ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZA")).toBeNull(); // 27 chars
    expect(normalizeSyncCode("9BCD-EFGH-IJKL-MNOP-QRST-UVWX-YA")).toBeNull(); // 9 isn't base32
    expect(normalizeSyncCode("ABCD-EFGH-IJKL-MNOP-QRST-UVWX-Y!")).toBeNull();
  });

  it("rejects a last char whose spare bits aren't zero", () => {
    // 26 chars carry 130 bits; only A E I M Q U Y 4 leave the last 2 bits clear.
    expect(normalizeSyncCode("ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YA")).not.toBeNull();
    expect(normalizeSyncCode("ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YB")).toBeNull();
  });
});

describe("deriveSyncKeys", () => {
  it("derives the same id and token from the same code, however it was typed", async () => {
    const code = generateSyncCode();
    const a = await deriveSyncKeys(code);
    const b = await deriveSyncKeys(code.toLowerCase().replace(/-/g, " "));
    expect(a.syncId).toMatch(/^[0-9a-f]{32}$/);
    expect(a.writeToken).toMatch(/^[0-9a-f]{64}$/);
    expect(b.syncId).toBe(a.syncId);
    expect(b.writeToken).toBe(a.writeToken);
    // The id and the token come from different HKDF info strings.
    expect(a.writeToken.startsWith(a.syncId)).toBe(false);
  });

  it("derives different values from different codes", async () => {
    const a = await deriveSyncKeys(generateSyncCode());
    const b = await deriveSyncKeys(generateSyncCode());
    expect(b.syncId).not.toBe(a.syncId);
    expect(b.writeToken).not.toBe(a.writeToken);
  });

  it("is stable for a fixed code", async () => {
    const a = await deriveSyncKeys("ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YA");
    const b = await deriveSyncKeys("ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YA");
    expect(a.syncId).toBe(b.syncId);
    expect(a.writeToken).toBe(b.writeToken);
  });

  it("makes a non-extractable AES-GCM 256 key", async () => {
    const { encKey } = await deriveSyncKeys(generateSyncCode());
    expect(encKey.extractable).toBe(false);
    expect(encKey.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    expect([...encKey.usages].sort()).toEqual(["decrypt", "encrypt"]);
  });

  it("throws on an invalid code", async () => {
    await expect(deriveSyncKeys("not a code")).rejects.toThrow(/invalid sync code/i);
  });
});

describe("encryptBook / decryptBook", () => {
  const book = {
    positions: [{ id: "p1", symbol: "AAPL", entries: [{ price: 187.5, qty: 10 }], thesis: "Earnings ✓ — ünïcode" }],
    startingCash: 25000,
    deletions: { "position:old": "2026-11-01T00:00:00.000Z" },
  };

  it("round-trips the book", async () => {
    const { encKey } = await deriveSyncKeys(generateSyncCode());
    const blob = await encryptBook(encKey, book);
    expect(blob.iv).toMatch(/^[A-Za-z0-9+/]{16}$/);
    expect(blob.ciphertext).not.toContain("AAPL");
    expect(await decryptBook(encKey, blob)).toEqual(book);
  });

  it("uses a fresh IV for every encryption", async () => {
    const { encKey } = await deriveSyncKeys(generateSyncCode());
    const a = await encryptBook(encKey, book);
    const b = await encryptBook(encKey, book);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("fails to decrypt with a different code", async () => {
    const right = await deriveSyncKeys(generateSyncCode());
    const wrong = await deriveSyncKeys(generateSyncCode());
    const blob = await encryptBook(right.encKey, book);
    await expect(decryptBook(wrong.encKey, blob)).rejects.toThrow(/could not decrypt/i);
  });

  it("fails on tampered ciphertext", async () => {
    const { encKey } = await deriveSyncKeys(generateSyncCode());
    const blob = await encryptBook(encKey, book);
    const bytes = Uint8Array.from(atob(blob.ciphertext), (c) => c.charCodeAt(0));
    bytes[5] ^= 0x01;
    const tampered = { iv: blob.iv, ciphertext: btoa(String.fromCharCode(...bytes)) };
    await expect(decryptBook(encKey, tampered)).rejects.toThrow(/could not decrypt/i);
  });

  it("fails on a swapped IV", async () => {
    const { encKey } = await deriveSyncKeys(generateSyncCode());
    const a = await encryptBook(encKey, book);
    const b = await encryptBook(encKey, book);
    await expect(decryptBook(encKey, { iv: b.iv, ciphertext: a.ciphertext })).rejects.toThrow(/could not decrypt/i);
  });
});

describe("hashToken", () => {
  it("is SHA-256 hex", async () => {
    // SHA-256("abc") from FIPS 180-2.
    expect(await hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("is deterministic and differs per token", async () => {
    const { writeToken } = await deriveSyncKeys(generateSyncCode());
    expect(await hashToken(writeToken)).toBe(await hashToken(writeToken));
    expect(await hashToken(writeToken)).not.toBe(await hashToken(writeToken + "0"));
  });
});
