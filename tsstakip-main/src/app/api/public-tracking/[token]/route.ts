import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildPublicTrackingSnapshot, resolveTrackingProgress, resolveTrackingStage } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: service, error } = await supabase
    .from("services")
    .select(
      "public_tracking_token,public_tracking_enabled,service_number,customer_name,address,district,status,scheduled_at,started_at,completed_at,service_latitude,service_longitude,technician_last_latitude,technician_last_longitude,technician_last_seen_at,technician_eta_minutes,technician_arrived_at",
    )
    .eq("public_tracking_token", token)
    .eq("public_tracking_enabled", true)
    .single();

  if (error || !service) {
    return NextResponse.json({ ok: false, error: "Takip kaydı bulunamadı." }, { status: 404 });
  }

  const snapshot = buildPublicTrackingSnapshot(service);
  return NextResponse.json({
    ok: true,
    tracking: snapshot,
    progress: resolveTrackingProgress(snapshot.status),
    stage: resolveTrackingStage(snapshot.status),
  });
}
