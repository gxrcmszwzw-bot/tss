import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildTrustScoreBatch } from "@/lib/trust-score";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Yetkisiz." }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = process.env.TRUST_SCORE_CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const supabase = getSupabaseAdminClient();
  const { data: organizations, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (organizationError) {
    return NextResponse.json({ ok: false, error: organizationError.message }, { status: 500 });
  }

  let organizationsProcessed = 0;
  let scoresUpserted = 0;

  for (const organization of organizations ?? []) {
    const [subcontractorsResult, servicesResult, invoicesResult, inspectionsResult, alertsResult] =
      await Promise.all([
        supabase.from("subcontractors").select("*").eq("organization_id", organization.id),
        supabase.from("services").select("*").eq("organization_id", organization.id),
        supabase.from("service_invoices").select("*").eq("organization_id", organization.id),
        supabase
          .from("service_photo_inspections")
          .select("*")
          .eq("organization_id", organization.id),
        supabase.from("ai_alerts").select("*").eq("organization_id", organization.id),
      ]);

    const rows = buildTrustScoreBatch({
      organizationId: organization.id,
      subcontractors: subcontractorsResult.data ?? [],
      services: servicesResult.data ?? [],
      invoices: invoicesResult.data ?? [],
      photoInspections: inspectionsResult.data ?? [],
      aiAlerts: alertsResult.data ?? [],
    });

    if (rows.length > 0) {
      const { error } = await supabase
        .from("subcontractor_trust_scores")
        .upsert(rows, { onConflict: "organization_id,subcontractor_id" });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    organizationsProcessed += 1;
    scoresUpserted += rows.length;
  }

  return NextResponse.json({ ok: true, organizationsProcessed, scoresUpserted });
}
