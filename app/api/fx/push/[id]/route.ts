import type { NextRequest } from "next/server";
import { hashToken } from "@/lib/sync/crypto";
import { MAX_FX_ALERTS } from "@/lib/fxAlerts";
import type { FxPushAlert } from "@/lib/fxPushPlan";
import { deleteRecord, isPushConfigured, saveRecord, type PushSubscriptionJson } from "@/lib/server/fxPushStore";

// Opt-in FX push alerts. One record per random push id (never the sync id).
//
//   PUT    { subscription, alerts } + Bearer writeToken → 204 | 401
//   DELETE + Bearer writeToken → 204 | 401
//
// 400 bad id/body, 413 body too big, 503 push not configured, 502 storage error.

export const dynamic = "force-dynamic";

const ID_RE = /^[0-9a-f]{32}$/;
const BEARER_RE = /^Bearer ([0-9a-f]{64})$/;
const PAIR_RE = /^[A-Z]{3}\/[A-Z]{3}$/;
const MAX_BODY_CHARS = 32 * 1024;
const HEADERS = { "Cache-Control": "no-store" };

type Ctx = { params: Promise<{ id: string }> };

const error = (message: string, status: number) => Response.json({ error: message }, { status, headers: HEADERS });
const done = () => new Response(null, { status: 204, headers: HEADERS });

async function auth(request: NextRequest, ctx: Ctx): Promise<{ id: string; tokenHash: string } | Response> {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return error("invalid push id", 400);
  if (!isPushConfigured()) return error("push not configured", 503);
  const match = BEARER_RE.exec(request.headers.get("authorization") ?? "");
  if (!match) return error("missing token", 401);
  return { id, tokenHash: await hashToken(match[1]) };
}

function parseSubscription(v: unknown): PushSubscriptionJson | null {
  if (typeof v !== "object" || v === null) return null;
  const s = v as Record<string, unknown>;
  const keys = s.keys as Record<string, unknown> | undefined;
  if (typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://") || s.endpoint.length > 1024) return null;
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return null;
  if (keys.p256dh.length > 200 || keys.auth.length > 100) return null;
  return { endpoint: s.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

function parseAlert(v: unknown): FxPushAlert | null {
  if (typeof v !== "object" || v === null) return null;
  const a = v as Record<string, unknown>;
  const c = a.condition as Record<string, unknown> | undefined;
  if (typeof a.id !== "string" || a.id.length > 64) return null;
  if (typeof a.pair !== "string" || !PAIR_RE.test(a.pair)) return null;
  if (!c || (c.kind !== "above" && c.kind !== "below") || typeof c.level !== "number" || !(c.level > 0)) return null;
  if (a.repeat !== "once" && a.repeat !== "rearm") return null;
  if (a.state !== "armed" && a.state !== "fired" && a.state !== "paused") return null;
  return {
    id: a.id,
    pair: a.pair as FxPushAlert["pair"],
    condition: { kind: c.kind, level: c.level },
    repeat: a.repeat,
    state: a.state,
  };
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const who = await auth(request, ctx);
  if (who instanceof Response) return who;

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return error("body too large", 413);
  let body: { subscription?: unknown; alerts?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return error("invalid body", 400);
  }
  const subscription = parseSubscription(body.subscription);
  if (!subscription || !Array.isArray(body.alerts) || body.alerts.length > MAX_FX_ALERTS) return error("invalid body", 400);
  const alerts = body.alerts.map(parseAlert);
  if (alerts.some((a) => a === null)) return error("invalid alert", 400);

  try {
    const result = await saveRecord(who.id, who.tokenHash, { subscription, alerts: alerts as FxPushAlert[] });
    return result.status === "ok" ? done() : error("wrong token", 401);
  } catch {
    return error("storage error", 502);
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const who = await auth(request, ctx);
  if (who instanceof Response) return who;
  try {
    const result = await deleteRecord(who.id, who.tokenHash);
    return result.status === "ok" ? done() : error("wrong token", 401);
  } catch {
    return error("storage error", 502);
  }
}
