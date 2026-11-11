import type { NextRequest } from "next/server";
import { hashToken } from "@/lib/sync/crypto";
import { deleteBlob, getBlob, isConfigured, putBlob } from "@/lib/server/syncStore";

// Encrypted device sync. The server stores one opaque ciphertext blob per sync
// id and can never read it; see lib/sync/crypto.ts and lib/server/syncStore.ts.
//
//   GET    → 200 { version, iv, ciphertext } | 404
//   PUT    { baseVersion, iv, ciphertext } + Bearer writeToken
//          → 200 { version } | 409 { version, iv, ciphertext } | 401
//            | 404 (no blob and baseVersion ≠ 0, e.g. it was deleted)
//   DELETE + Bearer writeToken → 204 | 401
//
// Shared failures: 400 bad id/body, 413 body over 512 KB, 503 not configured,
// 502 storage error. Every response is `Cache-Control: no-store`.

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 512 * 1024;
const ID_RE = /^[0-9a-f]{32}$/;
const BEARER_RE = /^Bearer ([0-9a-f]{64})$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const IV_B64_LENGTH = 16; // 12 bytes

type Ctx = { params: Promise<{ id: string }> };

const HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: HEADERS });
}

const error = (message: string, status: number) => json({ error: message }, status);

/** Validates the id and configuration; returns the id or an error response. */
async function resolveId(ctx: Ctx): Promise<string | Response> {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return error("invalid sync id", 400);
  if (!isConfigured()) return error("sync not configured", 503);
  return id;
}

async function tokenHashFrom(request: NextRequest): Promise<string | null> {
  const match = BEARER_RE.exec(request.headers.get("authorization") ?? "");
  return match ? hashToken(match[1]) : null;
}

class TooLargeError extends Error {}

/** Reads the body as text, stopping as soon as it passes `limit` bytes. */
async function readBodyLimited(request: NextRequest, limit: number): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw new TooLargeError();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      throw new TooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function parsePutBody(text: string): { baseVersion: number; iv: string; ciphertext: string } | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  const { baseVersion, iv, ciphertext } = body as Record<string, unknown>;
  if (typeof baseVersion !== "number" || !Number.isSafeInteger(baseVersion) || baseVersion < 0) return null;
  if (typeof iv !== "string" || iv.length !== IV_B64_LENGTH || !BASE64_RE.test(iv)) return null;
  if (typeof ciphertext !== "string" || !BASE64_RE.test(ciphertext)) return null;
  return { baseVersion, iv, ciphertext };
}

function storeFailure(err: unknown): Response {
  console.error("[sync] storage error", err);
  return error("sync storage error", 502);
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const id = await resolveId(ctx);
  if (id instanceof Response) return id;
  try {
    const blob = await getBlob(id);
    return blob ? json(blob) : error("not found", 404);
  } catch (err) {
    return storeFailure(err);
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const id = await resolveId(ctx);
  if (id instanceof Response) return id;

  const tokenHash = await tokenHashFrom(request);
  if (!tokenHash) return error("unauthorized", 401);

  let text: string;
  try {
    text = await readBodyLimited(request, MAX_BODY_BYTES);
  } catch (err) {
    if (err instanceof TooLargeError) return error("sync data too large", 413);
    return error("could not read body", 400);
  }
  const input = parsePutBody(text);
  if (!input) return error("invalid body", 400);

  try {
    const result = await putBlob(id, input, tokenHash);
    switch (result.status) {
      case "ok":
        return json({ version: result.version });
      case "conflict":
        return json(result.current, 409);
      case "unauthorized":
        return error("unauthorized", 401);
      case "missing":
        return error("not found", 404);
    }
  } catch (err) {
    return storeFailure(err);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const id = await resolveId(ctx);
  if (id instanceof Response) return id;

  const tokenHash = await tokenHashFrom(request);
  if (!tokenHash) return error("unauthorized", 401);

  try {
    const result = await deleteBlob(id, tokenHash);
    if (result.status === "unauthorized") return error("unauthorized", 401);
    return new Response(null, { status: 204, headers: HEADERS });
  } catch (err) {
    return storeFailure(err);
  }
}
