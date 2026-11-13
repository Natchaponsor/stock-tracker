import webpush from "web-push";
import { alertPairs } from "@/lib/fxAlerts";
import { planPushes } from "@/lib/fxPushPlan";
import { fetchLatest } from "@/lib/server/frankfurter";
import { dropRecord, isPushConfigured, listRecords, updateSent } from "@/lib/server/fxPushStore";

// The daily FX alert check (Vercel Cron, vercel.json). Vercel calls it with
// `Authorization: Bearer $CRON_SECRET`. One rates request per base currency for
// all devices, then at most one push per alert per firing.

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: HEADERS });
  }
  if (!isPushConfigured()) return Response.json({ error: "push not configured" }, { status: 503, headers: HEADERS });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:fx-alerts@example.invalid",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const records = await listRecords();
  const pairs = Array.from(new Set(records.flatMap(([, r]) => alertPairs(r.alerts))));
  if (pairs.length === 0) return Response.json({ devices: records.length, sent: 0 }, { headers: HEADERS });
  const latest = await fetchLatest(pairs);

  let sent = 0;
  let dropped = 0;
  for (const [id, record] of records) {
    const plan = planPushes(record.alerts, record.sent, latest);
    let gone = false;
    for (const notice of plan.notices) {
      try {
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({ title: notice.title, body: notice.body, pair: notice.pair, alertId: notice.alertId }),
          { TTL: 60 * 60 * 24 }
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          gone = true;
          break;
        }
        // Any other failure: don't count it as sent, so tomorrow's check tries again.
        for (const key of Object.keys(plan.sent)) {
          if (key.startsWith(`${notice.alertId}:`) && !(key in record.sent)) delete plan.sent[key];
        }
      }
    }
    if (gone) {
      await dropRecord(id);
      dropped++;
    } else if (JSON.stringify(plan.sent) !== JSON.stringify(record.sent)) {
      await updateSent(id, plan.sent);
    }
  }
  return Response.json({ devices: records.length, sent, dropped }, { headers: HEADERS });
}
