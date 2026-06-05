import { NextResponse } from "next/server";

import { processPendingNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Yetkisiz." }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(rawLimit) ? rawLimit : 10;

  const result = await processPendingNotifications({ limit });
  return NextResponse.json({ ok: true, ...result });
}
