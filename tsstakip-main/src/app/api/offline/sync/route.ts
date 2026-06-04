import { NextResponse } from "next/server";

import { getSessionProfile } from "@/lib/auth";
import { calculateExpectedRevenue, determineFinanceStatusFromCosts, resolveServiceFinanceBaseline } from "@/lib/finance";
import type { FeeType, TeamType } from "@/lib/supabase/types";

type OfflineQueueEntry = {
  id: string;
  kind: "service_create";
  createdAt: string;
  retryCount: number;
  payload: Record<string, string>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function parseNullable(value: string | undefined) {
  return value && value.trim() ? value.trim() : null;
}

function parseAmount(value: string | undefined) {
  if (!value || !value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateTime(value: string | undefined) {
  return value && value.trim() ? new Date(value).toISOString() : null;
}

async function resolveTeamFields(
  supabase: Awaited<ReturnType<typeof getSessionProfile>>["supabase"],
  teamType: TeamType,
  subcontractorId: string | null,
) {
  if (teamType !== "subcontractor" || !subcontractorId) {
    return {
      subcontractor_id: null,
      subcontractor_contact: null,
      subcontractor_phone: null,
    };
  }

  const { data } = await supabase
    .from("subcontractors")
    .select("id,contact_name,phone")
    .eq("id", subcontractorId)
    .single();

  return {
    subcontractor_id: subcontractorId,
    subcontractor_contact: data?.contact_name ?? null,
    subcontractor_phone: data?.phone ?? null,
  };
}

async function handleServiceCreate(entry: OfflineQueueEntry) {
  const session = await getSessionProfile();
  const { supabase, user, profile, activeOrganizationId } = session;

  if (!user || !profile || !profile.is_active || !activeOrganizationId) {
    throw new Error("Aktif oturum veya organizasyon bulunamadı.");
  }

  const payload = entry.payload;
  const feeType = (payload.fee_type ?? "free") as FeeType;
  const teamType = (payload.team_type ?? "technical_team") as TeamType;
  const status = feeType === "paid" ? "awaiting_approval" : "approved";

  const baseline = await resolveServiceFinanceBaseline(
    supabase,
    parseNullable(payload.catalog_item_id),
    parseNullable(payload.region_id),
  );
  const assignment = await resolveTeamFields(
    supabase,
    teamType,
    parseNullable(payload.subcontractor_id),
  );

  const amount = parseAmount(payload.amount);
  const memberId =
    teamType === "technical_team"
      ? profile.role === "admin"
        ? parseNullable(payload.member_id)
        : user.id
      : null;

  const { error } = await supabase.from("services").insert({
    organization_id: activeOrganizationId,
    customer_name: payload.customer_name ?? "",
    customer_phone: payload.customer_phone ?? "",
    address: payload.address ?? "",
    district: parseNullable(payload.district),
    site_id: payload.site_id ?? "",
    project_name: parseNullable(payload.project_name),
    product_group_id: parseNullable(payload.product_group_id),
    service_type_id: parseNullable(payload.service_type_id),
    member_id: memberId,
    priority: (payload.priority ?? "normal") as "urgent" | "high" | "normal" | "low",
    scheduled_at: parseDateTime(payload.scheduled_at),
    description: parseNullable(payload.description),
    status,
    team_type: teamType,
    region_id: parseNullable(payload.region_id),
    catalog_item_id: parseNullable(payload.catalog_item_id),
    service_latitude: parseAmount(payload.service_latitude),
    service_longitude: parseAmount(payload.service_longitude),
    geofence_radius_meters: parseAmount(payload.geofence_radius_meters) ?? 150,
    fee_type: feeType,
    amount,
    currency: payload.currency ?? "TRY",
    standard_price_snapshot: baseline.standardPriceSnapshot,
    regional_multiplier_snapshot: baseline.regionalMultiplierSnapshot,
    expected_revenue: baseline.expectedRevenue ?? calculateExpectedRevenue(baseline.standardPriceSnapshot, baseline.regionalMultiplierSnapshot),
    finance_status:
      feeType === "paid"
        ? determineFinanceStatusFromCosts(null)
        : "not_initialized",
    created_by: user.id,
    ...assignment,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session.user) {
    return jsonError("Oturum bulunamadı.", 401);
  }

  let entry: OfflineQueueEntry;
  try {
    entry = (await request.json()) as OfflineQueueEntry;
  } catch {
    return jsonError("Offline payload okunamadı.", 400);
  }

  try {
    if (entry.kind === "service_create") {
      await handleServiceCreate(entry);
      return NextResponse.json({ ok: true });
    }

    return jsonError("Desteklenmeyen offline işlem.", 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
