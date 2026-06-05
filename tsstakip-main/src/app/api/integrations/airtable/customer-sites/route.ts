import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { findTurkeyCity, findTurkeyDistrict } from "@/lib/turkey-locations";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Yetkisiz." }, { status: 401 });
}

async function upsertCustomerSite(input: {
  organizationId: string;
  siteCode: string;
  siteName?: string | null;
  customerName: string;
  customerPhone?: string | null;
  address?: string | null;
  cityCode?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  projectName?: string | null;
  airtableRecordId?: string | null;
}) {
  const admin = getSupabaseAdminClient();
  const city = findTurkeyCity(input.cityCode ?? input.cityName ?? "");

  const { error } = await admin.from("customer_sites").upsert({
    organization_id: input.organizationId,
    site_code: input.siteCode,
    site_name: input.siteName ?? null,
    customer_name: input.customerName,
    customer_phone: input.customerPhone ?? null,
    address: input.address ?? null,
    city_code: city?.code ?? null,
    city_name: city?.name ?? input.cityName ?? null,
    district_name: city
      ? findTurkeyDistrict(city.code, input.districtName)?.name ?? input.districtName ?? null
      : input.districtName ?? null,
    project_name: input.projectName ?? null,
    airtable_record_id: input.airtableRecordId ?? null,
    source: "airtable",
    is_active: true,
  }, {
    onConflict: input.airtableRecordId ? "organization_id,airtable_record_id" : "organization_id,site_code",
  });

  if (error) {
    throw new Error(error.message);
  }
}

type AirtablePayload = {
  organization_id?: string;
  organizationId?: string;
  record_id?: string;
  recordId?: string;
  site_code?: string;
  siteCode?: string;
  site_name?: string;
  siteName?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  address?: string;
  city_code?: string;
  cityCode?: string;
  city_name?: string;
  cityName?: string;
  district_name?: string;
  districtName?: string;
  project_name?: string;
  projectName?: string;
};

export async function POST(request: Request) {
  const secret = process.env.AIRTABLE_SYNC_SECRET?.trim();
  const authHeader = request.headers.get("authorization")?.trim();

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return unauthorized();
  }

  let payload: AirtablePayload | AirtablePayload[];
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON payload okunamadi." }, { status: 400 });
  }

  const rows = Array.isArray(payload) ? payload : [payload];
  let processed = 0;

  for (const row of rows) {
    const organizationId = row.organization_id ?? row.organizationId;
    const siteCode = row.site_code ?? row.siteCode;
    const customerName = row.customer_name ?? row.customerName;

    if (!organizationId || !siteCode || !customerName) {
      return NextResponse.json({
        ok: false,
        error: "organization_id, site_code ve customer_name gerekli.",
      }, { status: 400 });
    }

    await upsertCustomerSite({
      organizationId,
      siteCode,
      siteName: row.site_name ?? row.siteName ?? null,
      customerName,
      customerPhone: row.customer_phone ?? row.customerPhone ?? null,
      address: row.address ?? null,
      cityCode: row.city_code ?? row.cityCode ?? null,
      cityName: row.city_name ?? row.cityName ?? null,
      districtName: row.district_name ?? row.districtName ?? null,
      projectName: row.project_name ?? row.projectName ?? null,
      airtableRecordId: row.record_id ?? row.recordId ?? null,
    });

    processed += 1;
  }

  return NextResponse.json({ ok: true, processed });
}
