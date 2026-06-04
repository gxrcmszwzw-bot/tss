"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin, requireProfile } from "@/lib/auth";
import {
  buildNextCutoffDefaults,
  calculateExpectedRevenue,
  calculateMarginEstimate,
  determineFinanceStatusFromCosts,
  evaluateInvoiceMatch,
  preparePayoutBatchItems,
  resolveServiceFinanceBaseline,
} from "@/lib/finance";
import { distanceBetweenMeters } from "@/lib/geofence";
import {
  processPendingPhotoInspections,
  processPendingVoiceNotes,
  processPhotoInspection,
  processVoiceNoteAnalysis,
} from "@/lib/ai";
import { createMemberAccount, deleteMemberAccount, updateMemberProfile } from "@/lib/supabase/members";
import { queueNotificationEvent } from "@/lib/notifications";
import { buildSubcontractorTrustScore } from "@/lib/trust-score";
import type {
  FeeType,
  NegotiationStatus,
  NotificationChannel,
  PhotoType,
  ServicePriority,
  ServiceStatus,
  TeamType,
  UserRole,
} from "@/lib/supabase/types";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function amount(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateTime(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

function dateOnly(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

function adminReturnPath(formData: FormData) {
  const value = text(formData, "return_to");
  return value === "/admin/management" ? "/admin/management" : "/admin/members";
}

type ActionSupabaseClient = Awaited<ReturnType<typeof requireProfile>>["supabase"];

async function teamFields(
  supabase: ActionSupabaseClient,
  teamType: TeamType,
  subcontractorId: string | null,
) {
  if (teamType !== "subcontractor") {
    return {
      subcontractor_id: null,
      subcontractor_contact: null,
      subcontractor_phone: null,
    };
  }

  if (!subcontractorId) {
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

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    for (const key of ["message", "msg", "error", "details", "hint"]) {
      const value = obj[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export async function createServiceAction(formData: FormData) {
  const { supabase, user, profile, activeOrganizationId } = await requireProfile();
  if (!activeOrganizationId) {
    redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/new?error=${encodeURIComponent("Aktif organizasyon bulunamadi.")}`);
  }
  const feeType = (text(formData, "fee_type") ?? "free") as FeeType;
  const teamType = (text(formData, "team_type") ?? "technical_team") as TeamType;
  const status: ServiceStatus =
    feeType === "paid" ? "awaiting_approval" : "approved";
  const memberId =
    teamType === "technical_team"
      ? profile.role === "admin"
        ? (text(formData, "member_id") ?? user.id)
        : user.id
      : null;
  const regionId = text(formData, "region_id");
  const catalogItemId = text(formData, "catalog_item_id");
  const assignment = await teamFields(supabase, teamType, text(formData, "subcontractor_id"));
  const financeBaseline = await resolveServiceFinanceBaseline(
    supabase,
    catalogItemId,
    regionId,
  );

  const { data, error } = await supabase
    .from("services")
    .insert({
      organization_id: activeOrganizationId,
      customer_name: text(formData, "customer_name") ?? "",
      customer_phone: text(formData, "customer_phone") ?? "",
      address: text(formData, "address") ?? "",
      district: text(formData, "district"),
      site_id: text(formData, "site_id") ?? "",
      project_name: text(formData, "project_name"),
      product_group_id: text(formData, "product_group_id"),
      service_type_id: text(formData, "service_type_id"),
      region_id: regionId,
      catalog_item_id: catalogItemId,
      service_latitude: amount(formData, "service_latitude"),
      service_longitude: amount(formData, "service_longitude"),
      geofence_radius_meters: amount(formData, "geofence_radius_meters") ?? 150,
      member_id: memberId,
      priority: (text(formData, "priority") ?? "normal") as ServicePriority,
      scheduled_at: dateTime(text(formData, "scheduled_at")),
      description: text(formData, "description"),
      status,
      team_type: teamType,
      ...assignment,
      fee_type: feeType,
      amount: amount(formData, "amount"),
      currency: text(formData, "currency") ?? "TRY",
      standard_price_snapshot: financeBaseline.standardPriceSnapshot,
      regional_multiplier_snapshot: financeBaseline.regionalMultiplierSnapshot,
      expected_revenue: financeBaseline.expectedRevenue,
      negotiated_cost: null,
      approved_cost: null,
      margin_estimate: null,
      finance_status:
        financeBaseline.standardPriceSnapshot === null
          ? "not_initialized"
          : "awaiting_negotiation",
      customer_approval_sent_at: feeType === "paid" ? new Date().toISOString() : null,
      customer_approved_at: feeType === "paid" ? null : new Date().toISOString(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/member");
  redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/${data.id}`);
}

export async function updateServiceAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  const teamType = (text(formData, "team_type") ?? "technical_team") as TeamType;
  const regionId = text(formData, "region_id");
  const catalogItemId = text(formData, "catalog_item_id");
  const assignment = await teamFields(supabase, teamType, text(formData, "subcontractor_id"));
  const financeBaseline = await resolveServiceFinanceBaseline(
    supabase,
    catalogItemId,
    regionId,
  );

  const { error } = await supabase
    .from("services")
    .update({
      customer_name: text(formData, "customer_name") ?? "",
      customer_phone: text(formData, "customer_phone") ?? "",
      address: text(formData, "address") ?? "",
      district: text(formData, "district"),
      site_id: text(formData, "site_id") ?? "",
      project_name: text(formData, "project_name"),
      product_group_id: text(formData, "product_group_id"),
      service_type_id: text(formData, "service_type_id"),
      region_id: regionId,
      catalog_item_id: catalogItemId,
      service_latitude: amount(formData, "service_latitude"),
      service_longitude: amount(formData, "service_longitude"),
      geofence_radius_meters: amount(formData, "geofence_radius_meters") ?? 150,
      member_id: teamType === "technical_team" ? text(formData, "member_id") : null,
      priority: (text(formData, "priority") ?? "normal") as ServicePriority,
      scheduled_at: dateTime(text(formData, "scheduled_at")),
      description: text(formData, "description"),
      status: (text(formData, "status") ?? "pending") as ServiceStatus,
      team_type: teamType,
      ...assignment,
      fee_type: (text(formData, "fee_type") ?? "free") as FeeType,
      amount: amount(formData, "amount"),
      currency: text(formData, "currency") ?? "TRY",
      standard_price_snapshot: financeBaseline.standardPriceSnapshot,
      regional_multiplier_snapshot: financeBaseline.regionalMultiplierSnapshot,
      expected_revenue: financeBaseline.expectedRevenue,
    })
    .eq("id", id);

  if (error) {
    redirect(`/admin/services/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/services/${id}`);
}

export async function updateServiceStatusAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const id = text(formData, "id");
  const status = text(formData, "status") as ServiceStatus | null;
  if (!id || !status) return;

  const patch: {
    status: ServiceStatus;
    started_at?: string;
    completed_at?: string;
    customer_approved_at?: string;
    customer_rejected_at?: string;
  } = { status };

  if (status === "in_progress") patch.started_at = new Date().toISOString();
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (status === "approved") patch.customer_approved_at = new Date().toISOString();
  if (status === "rejected") patch.customer_rejected_at = new Date().toISOString();

  const { error } = await supabase.from("services").update(patch).eq("id", id);
  if (error) return;

  revalidatePath(`/${profile.role === "admin" ? "admin" : "member"}/services/${id}`);
  revalidatePath(`/${profile.role === "admin" ? "admin" : "member"}`);
}

export async function startServiceWithGeofenceAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const id = text(formData, "id");
  const latitude = amount(formData, "current_latitude");
  const longitude = amount(formData, "current_longitude");
  if (!id || latitude === null || longitude === null) return;

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id,status,service_latitude,service_longitude,geofence_radius_meters")
    .eq("id", id)
    .single();

  if (serviceError || !service) {
    return;
  }

  if (service.status !== "approved") {
    redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/${id}?error=${encodeURIComponent("Servis başlatılamaz. Önce onaylı durumda olmalı.")}`);
  }

  if (service.service_latitude === null || service.service_longitude === null) {
    redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/${id}?error=${encodeURIComponent("Geofence koordinatları tanımlı değil.")}`);
  }

  const distance = distanceBetweenMeters(
    latitude,
    longitude,
    service.service_latitude,
    service.service_longitude,
  );
  const allowedRadius = service.geofence_radius_meters ?? 150;

  if (distance > allowedRadius) {
    redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/${id}?error=${encodeURIComponent(`Konum doğrulaması başarısız. Mesafe ${Math.round(distance)} m, izin verilen ${allowedRadius} m.`)}`);
  }

  const { error } = await supabase
    .from("services")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return;

  const { data: notificationService } = await supabase
    .from("services")
    .select("organization_id,customer_name,customer_phone,service_number")
    .eq("id", id)
    .single();

  if (notificationService) {
    await queueNotificationEvent({
      organizationId: notificationService.organization_id,
      eventKey: "service_started",
      serviceId: id,
      recipient: notificationService.customer_phone,
      payload: {
        customer_name: notificationService.customer_name,
        service_number: notificationService.service_number,
      },
      channels: ["sms"],
    });
  }

  revalidatePath(`/${profile.role === "admin" ? "admin" : "member"}/services/${id}`);
  revalidatePath(`/${profile.role === "admin" ? "admin" : "member"}`);
}

export async function deleteServiceAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/admin");
  redirect("/admin/services");
}

export async function deleteServicePhotoAction(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const id = text(formData, "id");
  const serviceId = text(formData, "service_id");
  const storagePath = text(formData, "storage_path");
  if (!id || !storagePath || !serviceId) return;

  await supabase.storage.from("service-photos").remove([storagePath]);
  await supabase.from("service_photos").delete().eq("id", id);

  const base = profile.role === "admin" ? "/admin" : "/member";
  revalidatePath(`${base}/services/${serviceId}`);
}

export async function requestServicePhotoInspectionAction(formData: FormData) {
  const { supabase, user, profile, activeOrganizationId } = await requireProfile();
  const serviceId = text(formData, "service_id");
  const photoId = text(formData, "photo_id");
  const photoType = text(formData, "photo_type");
  if (!serviceId || !photoId || !photoType || !activeOrganizationId) return;

  const { error } = await supabase.from("service_photo_inspections").upsert(
    {
      organization_id: activeOrganizationId,
      service_id: serviceId,
      photo_id: photoId,
      photo_type: photoType as PhotoType,
      requested_by: user.id,
      status: "pending",
      processing_error: null,
      reviewed_at: null,
    },
    { onConflict: "photo_id" },
  );

  if (error) {
    redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/${serviceId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/${profile.role === "admin" ? "admin" : "member"}/services/${serviceId}`);
}

export async function createMemberAction(formData: FormData) {
  const { activeOrganizationId } = await requireAdmin();
  const returnTo = adminReturnPath(formData);
  if (!activeOrganizationId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Aktif organizasyon bulunamadi.")}`);
  }
  try {
    await createMemberAccount({
      email: text(formData, "email") ?? "",
      password: text(formData, "password") ?? "",
      fullName: text(formData, "full_name") ?? "",
      phone: text(formData, "phone") ?? undefined,
      role: (text(formData, "role") ?? "member") as UserRole,
      organizationId: activeOrganizationId,
    });
  } catch (error) {
    console.error("Member action failed:", error);
    redirect(`${returnTo}?error=${encodeURIComponent(formatError(error))}`);
  }
  revalidatePath(returnTo);
  redirect(`${returnTo}?ok=1`);
}

export async function updateMemberAction(formData: FormData) {
  await requireAdmin();
  const returnTo = adminReturnPath(formData);
  const id = text(formData, "id");
  if (!id) return;
  try {
    await updateMemberProfile(id, {
      fullName: text(formData, "full_name") ?? undefined,
      phone: text(formData, "phone"),
      role: (text(formData, "role") ?? "member") as UserRole,
      isActive: bool(formData, "is_active"),
    });
  } catch (error) {
    console.error("Member action failed:", error);
    redirect(`${returnTo}?error=${encodeURIComponent(formatError(error))}`);
  }
  revalidatePath(returnTo);
}

export async function deleteMemberAction(formData: FormData) {
  await requireAdmin();
  const returnTo = adminReturnPath(formData);
  const id = text(formData, "id");
  if (!id) return;
  try {
    await deleteMemberAccount(id);
  } catch (error) {
    console.error("Member action failed:", error);
    redirect(`${returnTo}?error=${encodeURIComponent(formatError(error))}`);
  }
  revalidatePath(returnTo);
}

export async function createProductGroupAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("product_groups").insert({ name: text(formData, "name") ?? "" });
  revalidatePath("/admin/settings");
}

export async function updateProductGroupAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase
    .from("product_groups")
    .update({ name: text(formData, "name") ?? "" })
    .eq("id", id);
  revalidatePath("/admin/settings");
}

export async function deleteProductGroupAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("product_groups").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

export async function createServiceTypeAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("service_types").insert({
    name: text(formData, "name") ?? "",
    product_group_id: text(formData, "product_group_id"),
  });
  revalidatePath("/admin/settings");
}

export async function updateServiceTypeAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase
    .from("service_types")
    .update({
      name: text(formData, "name") ?? "",
      product_group_id: text(formData, "product_group_id"),
    })
    .eq("id", id);
  revalidatePath("/admin/settings");
}

export async function deleteServiceTypeAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("service_types").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

export async function createSubcontractorAction(formData: FormData) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  if (!activeOrganizationId) return;
  await supabase.from("subcontractors").insert({
    organization_id: activeOrganizationId,
    name: text(formData, "name") ?? "",
    contact_name: text(formData, "contact_name"),
    phone: text(formData, "phone"),
  });
  revalidatePath("/admin/settings");
}

export async function updateSubcontractorAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase
    .from("subcontractors")
    .update({
      name: text(formData, "name") ?? "",
      contact_name: text(formData, "contact_name"),
      phone: text(formData, "phone"),
    })
    .eq("id", id);
  revalidatePath("/admin/settings");
}

export async function deleteSubcontractorAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("subcontractors").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

export async function createCatalogItemAction(formData: FormData) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  if (!activeOrganizationId) return;

  await supabase.from("catalog_items").insert({
    organization_id: activeOrganizationId,
    name: text(formData, "name") ?? "",
    code: text(formData, "code") ?? "",
    unit: text(formData, "unit"),
  });
  revalidatePath("/admin/settings");
}

export async function updateCatalogItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase
    .from("catalog_items")
    .update({
      name: text(formData, "name") ?? "",
      code: text(formData, "code") ?? "",
      unit: text(formData, "unit"),
    })
    .eq("id", id);
  revalidatePath("/admin/settings");
}

export async function deleteCatalogItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("catalog_items").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

export async function createCatalogPriceVersionAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const catalogItemId = text(formData, "catalog_item_id");
  const basePrice = amount(formData, "base_price");
  const effectiveFrom = dateTime(text(formData, "effective_from"));
  if (!catalogItemId || basePrice === null || !effectiveFrom) return;

  await supabase.from("catalog_price_versions").insert({
    catalog_item_id: catalogItemId,
    base_price: basePrice,
    currency: text(formData, "currency") ?? "TRY",
    effective_from: effectiveFrom,
    created_by: user.id,
  });
  revalidatePath("/admin/settings");
}

export async function createRegionAction(formData: FormData) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  if (!activeOrganizationId) return;

  await supabase.from("regions").insert({
    organization_id: activeOrganizationId,
    name: text(formData, "name") ?? "",
    code: text(formData, "code") ?? "",
  });
  revalidatePath("/admin/settings");
}

export async function updateRegionAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase
    .from("regions")
    .update({
      name: text(formData, "name") ?? "",
      code: text(formData, "code") ?? "",
    })
    .eq("id", id);
  revalidatePath("/admin/settings");
}

export async function deleteRegionAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("regions").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

export async function createRegionalPriceMultiplierAction(formData: FormData) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  if (!activeOrganizationId) return;
  const regionId = text(formData, "region_id");
  const catalogItemId = text(formData, "catalog_item_id");
  const multiplier = amount(formData, "multiplier");
  const effectiveFrom = dateTime(text(formData, "effective_from"));
  if (!regionId || !catalogItemId || multiplier === null || !effectiveFrom) return;

  await supabase.from("regional_price_multipliers").insert({
    organization_id: activeOrganizationId,
    region_id: regionId,
    catalog_item_id: catalogItemId,
    multiplier,
    effective_from: effectiveFrom,
  });
  revalidatePath("/admin/settings");
}

export async function updateRegionalPriceMultiplierAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  const multiplier = amount(formData, "multiplier");
  const effectiveFrom = dateTime(text(formData, "effective_from"));
  if (!id || multiplier === null || !effectiveFrom) return;

  await supabase
    .from("regional_price_multipliers")
    .update({
      multiplier,
      effective_from: effectiveFrom,
    })
    .eq("id", id);
  revalidatePath("/admin/settings");
}

export async function deleteRegionalPriceMultiplierAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;
  await supabase.from("regional_price_multipliers").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

export async function updatePhotoRulesAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("photo_rules")
    .update({
      require_start_photo: bool(formData, "require_start_photo"),
      require_end_photo: bool(formData, "require_end_photo"),
      camera_only: bool(formData, "camera_only"),
      gallery_upload_enabled: bool(formData, "gallery_upload_enabled"),
    })
    .eq("id", "00000000-0000-0000-0000-000000000001");
  revalidatePath("/admin/settings");
}

export async function createNotificationTemplateAction(formData: FormData) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  if (!activeOrganizationId) return;

  await supabase.from("notification_templates").insert({
    organization_id: activeOrganizationId,
    event_key: text(formData, "event_key") ?? "",
    channel: (text(formData, "channel") ?? "sms") as NotificationChannel,
    template_name: text(formData, "template_name") ?? "",
    body_template: text(formData, "body_template") ?? "",
  });

  revalidatePath("/admin/settings");
}

export async function updateNotificationTemplateAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;

  await supabase
    .from("notification_templates")
    .update({
      event_key: text(formData, "event_key") ?? "",
      channel: (text(formData, "channel") ?? "sms") as NotificationChannel,
      template_name: text(formData, "template_name") ?? "",
      body_template: text(formData, "body_template") ?? "",
      is_active: bool(formData, "is_active"),
    })
    .eq("id", id);

  revalidatePath("/admin/settings");
}

export async function deleteNotificationTemplateAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;

  await supabase.from("notification_templates").delete().eq("id", id);
  revalidatePath("/admin/settings");
}

export async function togglePriorityAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const priority = text(formData, "priority") as ServicePriority | null;
  if (!priority) return;
  await supabase
    .from("priority_settings")
    .update({ is_active: bool(formData, "is_active") })
    .eq("priority", priority);
  revalidatePath("/admin/settings");
}

export async function initializeServiceFinanceAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const serviceId = text(formData, "service_id");
  if (!serviceId) return;

  const standardPrice = amount(formData, "standard_price_snapshot");
  const multiplier = amount(formData, "regional_multiplier_snapshot");
  const negotiatedCost = amount(formData, "negotiated_cost");
  const approvedCost = amount(formData, "approved_cost");
  const expectedRevenue = calculateExpectedRevenue(standardPrice, multiplier);
  const marginEstimate = calculateMarginEstimate(expectedRevenue, approvedCost);

  const { error } = await supabase
    .from("services")
    .update({
      standard_price_snapshot: standardPrice,
      regional_multiplier_snapshot: multiplier ?? 1,
      expected_revenue: expectedRevenue,
      negotiated_cost: negotiatedCost,
      approved_cost: approvedCost,
      margin_estimate: marginEstimate,
      finance_status: determineFinanceStatusFromCosts(approvedCost),
    })
    .eq("id", serviceId);

  if (error) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/services");
}

export async function createServiceNegotiationAction(formData: FormData) {
  const { supabase, user, activeOrganizationId } = await requireAdmin();
  const serviceId = text(formData, "service_id");
  const offeredCost = amount(formData, "offered_cost");
  if (!serviceId || !activeOrganizationId || offeredCost === null) return;

  const status = (text(formData, "status") ?? "proposed") as NegotiationStatus;
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id,subcontractor_id,expected_revenue")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(serviceError?.message ?? "Servis bulunamadi.")}`);
  }

  const { error: negotiationError } = await supabase.from("service_negotiations").insert({
    organization_id: activeOrganizationId,
    service_id: serviceId,
    subcontractor_id: service.subcontractor_id,
    initiated_by: user.id,
    offered_cost: offeredCost,
    counterparty_note: text(formData, "counterparty_note"),
    internal_note: text(formData, "internal_note"),
    status,
  });

  if (negotiationError) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(negotiationError.message)}`);
  }

  if (status === "accepted") {
    const approvedCost = offeredCost;
    const marginEstimate = calculateMarginEstimate(service.expected_revenue, approvedCost);
    const { error: serviceUpdateError } = await supabase
      .from("services")
      .update({
        negotiated_cost: offeredCost,
        approved_cost: approvedCost,
        margin_estimate: marginEstimate,
        finance_status: "awaiting_invoice",
      })
      .eq("id", serviceId);

    if (serviceUpdateError) {
      redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(serviceUpdateError.message)}`);
    }
  }

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/services");
}

export async function createServiceInvoiceAction(formData: FormData) {
  const { supabase, user, activeOrganizationId } = await requireAdmin();
  const serviceId = text(formData, "service_id");
  const invoiceAmount = amount(formData, "invoice_amount");
  const storagePath = text(formData, "storage_path");
  if (!serviceId || !activeOrganizationId || invoiceAmount === null || !storagePath) {
    redirect(`/admin/services/${serviceId ?? ""}?error=${encodeURIComponent("Fatura dosyasi yuklenmeden kayit olusturulamaz.")}`);
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id,subcontractor_id,approved_cost")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(serviceError?.message ?? "Servis bulunamadi.")}`);
  }

  const match = evaluateInvoiceMatch(service.approved_cost, invoiceAmount);
  const { error: invoiceError } = await supabase.from("service_invoices").insert({
    organization_id: activeOrganizationId,
    service_id: serviceId,
    subcontractor_id: service.subcontractor_id,
    invoice_number: text(formData, "invoice_number"),
    invoice_date: dateOnly(text(formData, "invoice_date")),
    invoice_amount: invoiceAmount,
    currency: text(formData, "currency") ?? "TRY",
    storage_path: storagePath,
    match_status: match.status,
    match_reason: match.reason,
    uploaded_by: user.id,
  });

  if (invoiceError) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(invoiceError.message)}`);
  }

  const { error: serviceUpdateError } = await supabase
    .from("services")
    .update({
      finance_status: match.status === "matched" ? "approved_for_payout" : "invoice_under_review",
    })
    .eq("id", serviceId);

  if (serviceUpdateError) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(serviceUpdateError.message)}`);
  }

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/services");
}

export async function deleteServiceInvoiceAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const invoiceId = text(formData, "invoice_id");
  const serviceId = text(formData, "service_id");
  const storagePath = text(formData, "storage_path");
  if (!invoiceId || !serviceId || !storagePath) return;

  await supabase.storage.from("service-invoices").remove([storagePath]);
  await supabase.from("service_invoices").delete().eq("id", invoiceId);

  const { data: latestInvoice } = await supabase
    .from("service_invoices")
    .select("match_status")
    .eq("service_id", serviceId)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextFinanceStatus =
    latestInvoice?.match_status === "matched"
      ? "approved_for_payout"
      : latestInvoice?.match_status
        ? "invoice_under_review"
        : "awaiting_invoice";

  await supabase
    .from("services")
    .update({ finance_status: nextFinanceStatus })
    .eq("id", serviceId);

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin/services");
}

export async function generatePayoutBatchAction(formData: FormData) {
  const { supabase, user, activeOrganizationId } = await requireAdmin();
  if (!activeOrganizationId) return;

  const defaults = buildNextCutoffDefaults();
  const batchDate = text(formData, "batch_date") ?? defaults.batchDate.toISOString().slice(0, 10);
  const cutoffAt = dateTime(text(formData, "cutoff_at")) ?? defaults.cutoff.toISOString();

  const { data: batch, error: batchError } = await supabase
    .from("payout_batches")
    .upsert(
      {
        organization_id: activeOrganizationId,
        batch_date: batchDate,
        cutoff_at: cutoffAt,
        status: "draft",
        created_by: user.id,
      },
      { onConflict: "organization_id,batch_date" },
    )
    .select("id")
    .single();

  if (batchError || !batch) {
    redirect(`/admin/services?error=${encodeURIComponent(batchError?.message ?? "Payout batch olusturulamadi.")}`);
  }

  const [invoiceResult, serviceResult] = await Promise.all([
    supabase
      .from("service_invoices")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("services")
      .select("*")
      .eq("organization_id", activeOrganizationId),
  ]);

  if (invoiceResult.error || serviceResult.error) {
    redirect(`/admin/services?error=${encodeURIComponent(invoiceResult.error?.message ?? serviceResult.error?.message ?? "Payout verileri okunamadi.")}`);
  }

  const batchItems = preparePayoutBatchItems({
    invoices: invoiceResult.data ?? [],
    services: serviceResult.data ?? [],
    cutoffAt,
  });

  await supabase.from("payout_batch_items").delete().eq("batch_id", batch.id);

  if (batchItems.length > 0) {
    const { error: itemError } = await supabase.from("payout_batch_items").insert(
      batchItems.map((item) => ({
        batch_id: batch.id,
        invoice_id: item.invoiceId,
        service_id: item.serviceId,
        inclusion_status: item.inclusionStatus,
        reason_code: item.reasonCode,
      })),
    );

    if (itemError) {
      redirect(`/admin/services?error=${encodeURIComponent(itemError.message)}`);
    }
  }

  const includedServiceIds = batchItems
    .filter((item) => item.inclusionStatus === "included")
    .map((item) => item.serviceId);
  const excludedServiceIds = batchItems
    .filter((item) => item.inclusionStatus !== "included")
    .map((item) => item.serviceId);

  if (includedServiceIds.length > 0) {
    await supabase
      .from("services")
      .update({ finance_status: "approved_for_payout" })
      .in("id", includedServiceIds);
  }

  if (excludedServiceIds.length > 0) {
    await supabase
      .from("services")
      .update({ finance_status: "excluded_from_batch" })
      .in("id", excludedServiceIds);
  }

  revalidatePath("/admin/services");
  revalidatePath("/admin/reports");
  redirect(`/admin/services?ok=${encodeURIComponent(`Payout batch hazirlandi: ${batchDate}`)}`);
}

export async function overridePayoutBatchItemAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const batchId = text(formData, "batch_id");
  const itemId = text(formData, "item_id");
  const serviceId = text(formData, "service_id");
  const inclusionStatus = text(formData, "inclusion_status");
  const overrideNote = text(formData, "override_note");
  if (!batchId || !itemId || !serviceId || !inclusionStatus || !overrideNote) return;

  const normalizedStatus =
    inclusionStatus === "included" ? "included" : "overridden";
  const nextFinanceStatus =
    inclusionStatus === "included" ? "approved_for_payout" : "excluded_from_batch";

  const { error: itemError } = await supabase
    .from("payout_batch_items")
    .update({
      inclusion_status: normalizedStatus,
      reason_code: "manual_override",
      override_note: overrideNote,
    })
    .eq("id", itemId)
    .eq("batch_id", batchId);

  if (itemError) {
    redirect(`/admin/services?error=${encodeURIComponent(itemError.message)}`);
  }

  const { error: serviceError } = await supabase
    .from("services")
    .update({
      finance_status: nextFinanceStatus,
    })
    .eq("id", serviceId);

  if (serviceError) {
    redirect(`/admin/services?error=${encodeURIComponent(serviceError.message)}`);
  }

  revalidatePath("/admin/services");
}

export async function finalizePayoutBatchAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const batchId = text(formData, "batch_id");
  if (!batchId) return;

  const { error } = await supabase
    .from("payout_batches")
    .update({
      status: "finalized",
      finalized_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  if (error) {
    redirect(`/admin/services?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/services");
}

export async function markPayoutBatchPaidAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const batchId = text(formData, "batch_id");
  if (!batchId) return;

  const { error } = await supabase
    .from("payout_batches")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  if (error) {
    redirect(`/admin/services?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/services");
  revalidatePath("/admin/reports");
}

export async function createServiceVoiceNoteAction(formData: FormData) {
  const { supabase, user, activeOrganizationId, profile } = await requireProfile();
  const serviceId = text(formData, "service_id");
  const storagePath = text(formData, "storage_path");
  if (!serviceId || !storagePath || !activeOrganizationId) {
    redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/${serviceId ?? ""}?error=${encodeURIComponent("Ses notu yuklenmeden kayit olusturulamaz.")}`);
  }

  const { data, error } = await supabase
    .from("service_voice_notes")
    .insert({
      organization_id: activeOrganizationId,
      service_id: serviceId,
      uploaded_by: user.id,
      storage_path: storagePath,
      processing_status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/${serviceId}?error=${encodeURIComponent(error?.message ?? "Ses notu kaydedilemedi.")}`);
  }

  revalidatePath(`/${profile.role === "admin" ? "admin" : "member"}/services/${serviceId}`);
  redirect(`/${profile.role === "admin" ? "admin" : "member"}/services/${serviceId}?voice_note=${data.id}`);
}

export async function analyzeServiceVoiceNoteAction(formData: FormData) {
  const { activeOrganizationId } = await requireAdmin();
  const voiceNoteId = text(formData, "voice_note_id");
  const serviceId = text(formData, "service_id");
  const storagePath = text(formData, "storage_path");
  if (!voiceNoteId || !serviceId || !storagePath || !activeOrganizationId) return;

  const result = await processVoiceNoteAnalysis({
    organizationId: activeOrganizationId,
    serviceId,
    voiceNoteId,
    storagePath,
  });

  if (!result.ok) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin");
}

export async function processPendingVoiceNotesAction(formData: FormData) {
  const { activeOrganizationId } = await requireAdmin();
  const limit = amount(formData, "limit");
  if (!activeOrganizationId) return;

  try {
    const result = await processPendingVoiceNotes({
      organizationId: activeOrganizationId,
      limit: limit ?? 5,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    redirect(`/admin?ok=${encodeURIComponent(`AI kuyrugu islendi: ${result.succeeded}/${result.processed}`)}`);
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(formatError(error))}`);
  }
}

export async function analyzeServicePhotoInspectionAction(formData: FormData) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  const inspectionId = text(formData, "inspection_id");
  const serviceId = text(formData, "service_id");
  const photoId = text(formData, "photo_id");
  if (!inspectionId || !serviceId || !photoId || !activeOrganizationId) return;

  const { data: inspection, error } = await supabase
    .from("service_photo_inspections")
    .select("id,service_id,photo_id,photo_type,rubric_code")
    .eq("id", inspectionId)
    .eq("organization_id", activeOrganizationId)
    .maybeSingle();

  if (error || !inspection) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(error?.message ?? "Foto denetim kaydi bulunamadi.")}`);
  }

  const { data: photo, error: photoError } = await supabase
    .from("service_photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (photoError || !photo) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(photoError?.message ?? "Foto bulunamadi.")}`);
  }

  const result = await processPhotoInspection({
    organizationId: activeOrganizationId,
    serviceId,
    photoId,
    inspectionId,
    storagePath: photo.storage_path,
    photoType: inspection.photo_type,
    rubricCode: inspection.rubric_code,
  });

  if (!result.ok) {
    redirect(`/admin/services/${serviceId}?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath(`/admin/services/${serviceId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/ai-alerts");
}

export async function processPendingPhotoInspectionsAction(formData: FormData) {
  const { activeOrganizationId } = await requireAdmin();
  const limit = amount(formData, "limit");
  if (!activeOrganizationId) return;

  try {
    const result = await processPendingPhotoInspections({
      organizationId: activeOrganizationId,
      limit: limit ?? 5,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/ai-alerts");
    redirect(`/admin?ok=${encodeURIComponent(`Foto kuyrugu islendi: ${result.succeeded}/${result.processed}`)}`);
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(formatError(error))}`);
  }
}

export async function resolveAiAlertAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const alertId = text(formData, "alert_id");
  const resolvedNote = text(formData, "resolved_note");
  if (!alertId || !resolvedNote) return;

  const { error } = await supabase
    .from("ai_alerts")
    .update({
      is_resolved: true,
      resolved_note: resolvedNote,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/ai-alerts");
}

export async function reopenAiAlertAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const alertId = text(formData, "alert_id");
  if (!alertId) return;

  const { error } = await supabase
    .from("ai_alerts")
    .update({
      is_resolved: false,
      resolved_note: null,
      resolved_by: null,
      resolved_at: null,
    })
    .eq("id", alertId);

  if (error) {
    redirect(`/admin/ai-alerts?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/ai-alerts");
}

export async function refreshSubcontractorTrustScoresAction(formData: FormData) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  if (!activeOrganizationId) return;

  const subcontractorId = text(formData, "subcontractor_id");

  const [subcontractorsResult, servicesResult, invoicesResult, inspectionsResult, alertsResult] =
    await Promise.all([
      subcontractorId
        ? supabase.from("subcontractors").select("*").eq("id", subcontractorId).eq("organization_id", activeOrganizationId)
        : supabase.from("subcontractors").select("*").eq("organization_id", activeOrganizationId),
      supabase.from("services").select("*").eq("organization_id", activeOrganizationId),
      supabase.from("service_invoices").select("*").eq("organization_id", activeOrganizationId),
      supabase.from("service_photo_inspections").select("*").eq("organization_id", activeOrganizationId),
      supabase.from("ai_alerts").select("*").eq("organization_id", activeOrganizationId),
    ]);

  const subcontractors = subcontractorsResult.data ?? [];
  const scores = subcontractors.map((subcontractor) =>
    buildSubcontractorTrustScore({
      subcontractor,
      services: servicesResult.data ?? [],
      invoices: invoicesResult.data ?? [],
      photoInspections: inspectionsResult.data ?? [],
      aiAlerts: alertsResult.data ?? [],
    }),
  );

  if (scores.length > 0) {
    const { error } = await supabase.from("subcontractor_trust_scores").upsert(
      scores.map((score) => ({
        organization_id: activeOrganizationId,
        subcontractor_id: score.subcontractorId,
        score: score.score,
        grade: score.grade,
        service_count: score.serviceCount,
        completed_count: score.completedCount,
        on_time_rate: score.onTimeRate,
        invoice_match_rate: score.invoiceMatchRate,
        budget_adherence_rate: score.budgetAdherenceRate,
        quality_score: score.qualityScore,
        alert_penalty: score.alertPenalty,
        signals: score.signals,
        computed_at: new Date().toISOString(),
      })),
      { onConflict: "organization_id,subcontractor_id" },
    );

    if (error) {
      redirect(`/admin/management?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/management");
  revalidatePath("/admin/settings");
}
