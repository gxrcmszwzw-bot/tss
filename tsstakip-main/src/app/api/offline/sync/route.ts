import { NextResponse } from "next/server";

import { getSessionProfile } from "@/lib/auth";
import { calculateExpectedRevenue, determineFinanceStatusFromCosts, resolveServiceFinanceBaseline } from "@/lib/finance";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { FeeType, TeamType } from "@/lib/supabase/types";

type OfflineQueueEntry = {
  id: string;
  kind:
    | "service_create"
    | "service_photo_upload"
    | "service_invoice_upload"
    | "service_voice_note_upload";
  createdAt: string;
  retryCount: number;
  payload: Record<string, string>;
  asset?: {
    fileName: string;
    mimeType: string;
    dataUrl: string;
  } | null;
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

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Offline dosya verisi okunamadi.");
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
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

async function handlePhotoUpload(entry: OfflineQueueEntry) {
  const session = await getSessionProfile();
  const { user, activeOrganizationId } = session;
  const admin = getSupabaseAdminClient();
  const payload = entry.payload;
  const serviceId = payload.service_id;
  const photoType = payload.photo_type as "start" | "end" | "during";

  if (!user || !activeOrganizationId || !serviceId || !photoType || !entry.asset) {
    throw new Error("Offline fotograf payload eksik.");
  }

  const { mimeType, buffer } = decodeDataUrl(entry.asset.dataUrl);
  const ext = (entry.asset.fileName.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const storagePath = `services/${serviceId}/${photoType}-${Date.now()}.${safeExt}`;

  const { error: uploadError } = await admin.storage
    .from("service-photos")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: insertedPhoto, error: insertError } = await admin
    .from("service_photos")
    .insert({
      service_id: serviceId,
      photo_type: photoType,
      storage_path: storagePath,
      uploaded_by: user.id,
      taken_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !insertedPhoto) {
    throw new Error(insertError?.message ?? "Offline fotograf kaydi olusturulamadi.");
  }

  await admin.from("service_photo_inspections").upsert(
    {
      organization_id: activeOrganizationId,
      service_id: serviceId,
      photo_id: insertedPhoto.id,
      photo_type: photoType,
      requested_by: user.id,
      status: "pending",
    },
    { onConflict: "photo_id" },
  );

  if (photoType === "end") {
    await admin
      .from("services")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", serviceId)
      .eq("status", "in_progress");
  }
}

async function handleInvoiceUpload(entry: OfflineQueueEntry) {
  const session = await getSessionProfile();
  const { user, activeOrganizationId } = session;
  const admin = getSupabaseAdminClient();
  const payload = entry.payload;
  const serviceId = payload.service_id;
  const invoiceAmount = parseAmount(payload.invoice_amount);

  if (!user || !activeOrganizationId || !serviceId || invoiceAmount === null || !entry.asset) {
    throw new Error("Offline fatura payload eksik.");
  }

  const { data: service, error: serviceError } = await admin
    .from("services")
    .select("id,subcontractor_id,approved_cost")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    throw new Error(serviceError?.message ?? "Servis bulunamadi.");
  }

  const { mimeType, buffer } = decodeDataUrl(entry.asset.dataUrl);
  const ext = (entry.asset.fileName.split(".").pop() || "pdf").toLowerCase();
  const safeExt = ["pdf", "jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "pdf";
  const storagePath = `invoices/${serviceId}/invoice-${Date.now()}.${safeExt}`;

  const { error: uploadError } = await admin.storage
    .from("service-invoices")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const approvedCost = service.approved_cost;
  const difference = approvedCost === null ? null : Number((invoiceAmount - approvedCost).toFixed(2));
  const absoluteDifference = difference === null ? null : Math.abs(difference);
  const matchStatus =
    approvedCost === null
      ? "needs_review"
      : difference === 0
        ? "matched"
        : (absoluteDifference ?? 0) <= 10
          ? "needs_review"
          : "blocked";
  const matchReason =
    approvedCost === null
      ? "Onayli maliyet yok."
      : difference === 0
        ? "Fatura tutari onayli maliyetle eslesti."
        : (absoluteDifference ?? 0) <= 10
          ? "Fatura tutari sinirli farkla geldi."
          : "Fatura tutari onayli maliyetten farkli.";

  const { error: invoiceError } = await admin.from("service_invoices").insert({
    organization_id: activeOrganizationId,
    service_id: serviceId,
    subcontractor_id: service.subcontractor_id,
    invoice_number: parseNullable(payload.invoice_number),
    invoice_date: parseDateTime(payload.invoice_date)?.slice(0, 10) ?? null,
    invoice_amount: invoiceAmount,
    currency: payload.currency ?? "TRY",
    storage_path: storagePath,
    match_status: matchStatus,
    match_reason: matchReason,
    uploaded_by: user.id,
  });

  if (invoiceError) throw new Error(invoiceError.message);

  await admin
    .from("services")
    .update({
      finance_status: matchStatus === "matched" ? "approved_for_payout" : "invoice_under_review",
    })
    .eq("id", serviceId);
}

async function handleVoiceNoteUpload(entry: OfflineQueueEntry) {
  const session = await getSessionProfile();
  const { user, activeOrganizationId } = session;
  const admin = getSupabaseAdminClient();
  const payload = entry.payload;
  const serviceId = payload.service_id;

  if (!user || !activeOrganizationId || !serviceId || !entry.asset) {
    throw new Error("Offline ses notu payload eksik.");
  }

  const { mimeType, buffer } = decodeDataUrl(entry.asset.dataUrl);
  const ext = (entry.asset.fileName.split(".").pop() || "webm").toLowerCase();
  const safeExt = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"].includes(ext)
    ? ext
    : "webm";
  const storagePath = `voice-notes/${serviceId}/voice-note-${Date.now()}.${safeExt}`;

  const { error: uploadError } = await admin.storage
    .from("service-voice-notes")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { error } = await admin.from("service_voice_notes").insert({
    organization_id: activeOrganizationId,
    service_id: serviceId,
    uploaded_by: user.id,
    storage_path: storagePath,
    processing_status: "pending",
  });

  if (error) throw new Error(error.message);
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
    if (entry.kind === "service_photo_upload") {
      await handlePhotoUpload(entry);
      return NextResponse.json({ ok: true });
    }
    if (entry.kind === "service_invoice_upload") {
      await handleInvoiceUpload(entry);
      return NextResponse.json({ ok: true });
    }
    if (entry.kind === "service_voice_note_upload") {
      await handleVoiceNoteUpload(entry);
      return NextResponse.json({ ok: true });
    }

    return jsonError("Desteklenmeyen offline işlem.", 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
