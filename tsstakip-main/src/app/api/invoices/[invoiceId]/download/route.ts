import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  const { invoiceId } = await context.params;

  if (!activeOrganizationId) {
    return jsonError("Aktif organizasyon bulunamadı.", 400);
  }

  const { data: invoice, error } = await supabase
    .from("service_invoices")
    .select("id,organization_id,storage_path")
    .eq("id", invoiceId)
    .eq("organization_id", activeOrganizationId)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!invoice) {
    return jsonError("Fatura bulunamadı.", 404);
  }

  const adminSupabase = getSupabaseAdminClient();
  const { data: signed, error: signedError } = await adminSupabase.storage
    .from("service-invoices")
    .createSignedUrl(invoice.storage_path, 60, {
      download: false,
    });

  if (signedError || !signed?.signedUrl) {
    return jsonError(signedError?.message ?? "Signed URL üretilemedi.", 500);
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
