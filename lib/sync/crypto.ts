// Device-sync crypto. Runs in the browser and in Node (route handlers, vitest)
// through the global WebCrypto `crypto.subtle`, which browsers only expose over
// HTTPS or on localhost.
//
// The sync code is the only secret: 128 random bits shown as 26 base32
// characters. HKDF turns it into three independent values:
//   - syncId: where the blob lives on the server (useless without the code),
//   - encKey: AES-GCM 256 key that encrypts the book in the browser,
//   - writeToken: proves the right to overwrite or delete the blob; the server
//     keeps only its SHA-256 hash.

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const CODE_BYTES = 16;
const CODE_CHARS = 26; // ceil(128 / 5)
const GROUP_SIZE = 4;
const IV_BYTES = 12;

const INFO_ID = "stock-tracker sync id";
const INFO_KEY = "stock-tracker sync key";
const INFO_WRITE = "stock-tracker sync write";

/** Typed look-alikes that aren't in the base32 alphabet. */
const TYPO_MAP: Record<string, string> = { "0": "O", "1": "I", "8": "B" };

export interface SyncKeys {
  /** 32 lowercase hex chars; the blob's address on the server. */
  syncId: string;
  /** Non-extractable AES-GCM 256 key for `encryptBook` / `decryptBook`. */
  encKey: CryptoKey;
  /** 64 lowercase hex chars; sent as `Authorization: Bearer <writeToken>`. */
  writeToken: string;
}

export interface EncryptedBook {
  /** Base64 of the 12-byte AES-GCM IV. */
  iv: string;
  /** Base64 of the AES-GCM ciphertext (includes the 16-byte auth tag). */
  ciphertext: string;
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error("Sync needs WebCrypto, which is only available over HTTPS or on localhost.");
  return s;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeBase32(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

/** Decodes 26 canonical base32 chars to 16 bytes. Assumes already validated. */
function decodeBase32(chars: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(CODE_BYTES);
  let buffer = 0;
  let bits = 0;
  let i = 0;
  for (const c of chars) {
    buffer = (buffer << 5) | BASE32_ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      if (i < CODE_BYTES) out[i++] = (buffer >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
    buffer &= (1 << bits) - 1;
  }
  return out;
}

function group(chars: string): string {
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += GROUP_SIZE) parts.push(chars.slice(i, i + GROUP_SIZE));
  return parts.join("-");
}

/** A fresh sync code: 128 random bits as `ABCD-EFGH-…-YZ` (26 base32 chars). */
export function generateSyncCode(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(CODE_BYTES));
  return group(encodeBase32(bytes));
}

/**
 * Canonical grouped form of a typed or scanned code, or null if it isn't one.
 * Case, spaces and dashes don't matter, and 0/1/8 are read as O/I/B.
 * 26 chars carry 130 bits, so the last char's two spare bits must be zero
 * (it must be one of A E I M Q U Y 4); anything else is a typo.
 */
export function normalizeSyncCode(input: string): string | null {
  const chars = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[018]/g, (c) => TYPO_MAP[c]);
  if (chars.length !== CODE_CHARS) return null;
  for (const c of chars) if (!BASE32_ALPHABET.includes(c)) return null;
  if ((BASE32_ALPHABET.indexOf(chars[CODE_CHARS - 1]) & 0b11) !== 0) return null;
  return group(chars);
}

/** Derives the sync id, encryption key and write token from a sync code. Throws on an invalid code. */
export async function deriveSyncKeys(code: string): Promise<SyncKeys> {
  const normalized = normalizeSyncCode(code);
  if (!normalized) throw new Error("Invalid sync code");
  const ikm = decodeBase32(normalized.replace(/-/g, ""));
  const s = subtle();
  const master = await s.importKey("raw", ikm, "HKDF", false, ["deriveBits", "deriveKey"]);
  const enc = new TextEncoder();
  const hkdf = (info: string): HkdfParams => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: new Uint8Array(0),
    info: enc.encode(info),
  });

  const [idBits, writeBits, encKey] = await Promise.all([
    s.deriveBits(hkdf(INFO_ID), master, 128),
    s.deriveBits(hkdf(INFO_WRITE), master, 256),
    s.deriveKey(hkdf(INFO_KEY), master, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]),
  ]);

  return {
    syncId: toHex(new Uint8Array(idBits)),
    encKey,
    writeToken: toHex(new Uint8Array(writeBits)),
  };
}

/** JSON-encodes `data` and encrypts it with AES-GCM under a fresh random IV. */
export async function encryptBook(key: CryptoKey, data: unknown): Promise<EncryptedBook> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await subtle().encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

/** Decrypts and JSON-parses a blob. Throws if the key is wrong or the blob was altered. */
export async function decryptBook(key: CryptoKey, blob: EncryptedBook): Promise<unknown> {
  let plaintext: ArrayBuffer;
  try {
    const iv = fromBase64(blob.iv);
    if (iv.length !== IV_BYTES) throw new Error("bad IV length");
    plaintext = await subtle().decrypt({ name: "AES-GCM", iv }, key, fromBase64(blob.ciphertext));
  } catch (cause) {
    throw new Error("Could not decrypt the synced book (wrong code or damaged data)", { cause });
  }
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/** SHA-256 of a write token as 64 lowercase hex chars. The server stores and compares only this. */
export async function hashToken(token: string): Promise<string> {
  const digest = await subtle().digest("SHA-256", new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}
