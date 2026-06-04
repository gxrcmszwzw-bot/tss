import { NextResponse } from "next/server";

import { validateServiceStatusBearer } from "@/lib/api-tokens";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ServiceStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type StatusPayload = {
  service_number?: unknown;
  serviceNumber?: unknown;
  accepted?: unknown;
  approved?: unknown;
  kabul?: unknown;
};

function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;

  return bearerToken;
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "evet", "accepted"].includes(normalized)) return true;
  if (["false", "0", "no", "hayir", "hayır", "rejected"].includes(normalized)) return false;
  return null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const isAuthenticated = await validateServiceStatusBearer(readBearerToken(request));
  if (!isAuthenticated) {
    return jsonError("Geçersiz veya eksik bearer token.", 401);
  }

  let payload: StatusPayload;
  try {
    payload = (await request.json()) as StatusPayload;
  } catch {
    return jsonError("JSON body okunamadı.", 400);
  }

  const serviceNumber =
    typeof payload.service_number === "string"
      ? payload.service_number.trim()
      : typeof payload.serviceNumber === "string"
        ? payload.serviceNumber.trim()
        : "";
  const accepted = parseBoolean(payload.accepted ?? payload.approved ?? payload.kabul);

  if (!serviceNumber) {
    return jsonError("service_number zorunludur.", 400);
  }

  if (accepted === null) {
    return jsonError("accepted boolean olmalıdır.", 400);
  }

  const now = new Date().toISOString();
  const status: ServiceStatus = accepted ? "approved" : "rejected";
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("services")
    .update({
      status,
      customer_approved_at: accepted ? now : null,
      customer_rejected_at: accepted ? null : now,
    })
    .eq("service_number", serviceNumber)
    .select("id,service_number,status,customer_approved_at,customer_rejected_at")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError("Servis bulunamadı.", 404);
  }

  return NextResponse.json({
    ok: true,
    service: data,
  });
}
