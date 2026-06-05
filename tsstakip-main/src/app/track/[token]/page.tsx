import { notFound } from "next/navigation";

import { PublicTrackingView } from "@/components/tracking/PublicTrackingView";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildPublicTrackingSnapshot,
  resolveTrackingProgress,
  resolveTrackingStage,
} from "@/lib/tracking";

export const dynamic = "force-dynamic";

export default async function PublicTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getSupabaseAdminClient();

  const { data: service } = await supabase
    .from("services")
    .select(
      "public_tracking_token,public_tracking_enabled,service_number,customer_name,address,district,status,scheduled_at,started_at,completed_at,service_latitude,service_longitude,technician_last_latitude,technician_last_longitude,technician_last_seen_at,technician_eta_minutes,technician_arrived_at",
    )
    .eq("public_tracking_token", token)
    .eq("public_tracking_enabled", true)
    .single();

  if (!service) notFound();

  const snapshot = buildPublicTrackingSnapshot(service);

  return (
    <main className="min-h-screen bg-background">
      <PublicTrackingView
        initialProgress={resolveTrackingProgress(snapshot.status)}
        initialStage={resolveTrackingStage(snapshot.status)}
        initialTracking={snapshot}
      />
    </main>
  );
}
