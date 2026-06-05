import { NextResponse } from "next/server";

import { getSessionProfile } from "@/lib/auth";
import { distanceBetweenMeters } from "@/lib/geofence";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSessionProfile();

  if (!session.user || !session.profile?.is_active) {
    return jsonError("Oturum bulunamadı.", 401);
  }

  let body: { latitude?: number; longitude?: number } = {};
  try {
    body = (await request.json()) as { latitude?: number; longitude?: number };
  } catch {
    return jsonError("Konum payload okunamadı.", 400);
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return jsonError("Geçerli konum gönderilmedi.", 400);
  }

  const { supabase, user, profile } = session;
  const { data: service, error } = await supabase
    .from("services")
    .select("id,member_id,organization_id,status,service_latitude,service_longitude,geofence_radius_meters,technician_arrived_at")
    .eq("id", id)
    .single();

  if (error || !service) {
    return jsonError("Servis bulunamadı.", 404);
  }

  const isAdmin = profile.role === "admin";
  if (!isAdmin && service.member_id !== user.id) {
    return jsonError("Bu servis için konum güncelleme yetkiniz yok.", 403);
  }

  const patch: Database["public"]["Tables"]["services"]["Update"] = {
    technician_last_latitude: latitude,
    technician_last_longitude: longitude,
    technician_last_seen_at: new Date().toISOString(),
  };

  if (
    service.service_latitude !== null &&
    service.service_longitude !== null &&
    service.technician_arrived_at === null
  ) {
    const distance = distanceBetweenMeters(
      latitude,
      longitude,
      service.service_latitude,
      service.service_longitude,
    );
    if (distance <= (service.geofence_radius_meters ?? 150)) {
      patch.technician_arrived_at = new Date().toISOString();
    }
  }

  const { error: updateError } = await supabase
    .from("services")
    .update(patch)
    .eq("id", id);

  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  return NextResponse.json({ ok: true });
}
