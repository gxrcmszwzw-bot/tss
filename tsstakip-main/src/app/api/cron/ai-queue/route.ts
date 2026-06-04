import { NextResponse } from "next/server";

import {
  processPendingPhotoInspections,
  processPendingPhotoInspectionsAcrossOrganizations,
  processPendingVoiceNotes,
  processPendingVoiceNotesAcrossOrganizations,
} from "@/lib/ai";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getCronSecret() {
  const secret = process.env.AI_QUEUE_CRON_SECRET?.trim();
  if (!secret) {
    throw new Error("AI_QUEUE_CRON_SECRET tanimli degil.");
  }
  return secret;
}

function readCronToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return request.headers.get("x-cron-secret")?.trim() ?? "";
}

function isAuthorized(request: Request) {
  try {
    return readCronToken(request) === getCronSecret();
  } catch {
    return false;
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseKind(value: string | null) {
  if (value === "voice" || value === "photo" || value === "all") return value;
  return "all";
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Geçersiz veya eksik cron token.", 401);
  }

  const supabase = getSupabaseAdminClient();
  const [voiceResult, photoResult] = await Promise.all([
    supabase
      .from("service_voice_notes")
      .select("*", { count: "exact", head: true })
      .in("processing_status", ["pending", "failed"]),
    supabase
      .from("service_photo_inspections")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "failed"]),
  ]);

  if (voiceResult.error || photoResult.error) {
    return jsonError(voiceResult.error?.message ?? photoResult.error?.message ?? "AI kuyruk durumu okunamadi.", 500);
  }

  return NextResponse.json({
    ok: true,
    pending: {
      voice: voiceResult.count ?? 0,
      photo: photoResult.count ?? 0,
      total: (voiceResult.count ?? 0) + (photoResult.count ?? 0),
    },
    route: "/api/cron/ai-queue",
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError("Geçersiz veya eksik cron token.", 401);
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organization_id")?.trim() ?? "";
  const limit = parsePositiveInt(url.searchParams.get("limit"), 5);
  const maxOrganizations = parsePositiveInt(url.searchParams.get("max_organizations"), 10);
  const kind = parseKind(url.searchParams.get("kind"));

  try {
    if (organizationId) {
      if (kind === "voice") {
        const result = await processPendingVoiceNotes({
          organizationId,
          limit,
        });

        return NextResponse.json({
          ok: true,
          scope: "organization",
          kind,
          organizationId,
          ...result,
        });
      }

      if (kind === "photo") {
        const result = await processPendingPhotoInspections({
          organizationId,
          limit,
        });

        return NextResponse.json({
          ok: true,
          scope: "organization",
          kind,
          organizationId,
          ...result,
        });
      }

      const [voice, photo] = await Promise.all([
        processPendingVoiceNotes({
          organizationId,
          limit,
        }),
        processPendingPhotoInspections({
          organizationId,
          limit,
        }),
      ]);

      return NextResponse.json({
        ok: true,
        scope: "organization",
        kind,
        organizationId,
        voice,
        photo,
      });
    }

    if (kind === "voice") {
      const result = await processPendingVoiceNotesAcrossOrganizations({
        limitPerOrganization: limit,
        maxOrganizations,
      });

      return NextResponse.json({
        ok: true,
        scope: "global",
        kind,
        ...result,
      });
    }

    if (kind === "photo") {
      const result = await processPendingPhotoInspectionsAcrossOrganizations({
        limitPerOrganization: limit,
        maxOrganizations,
      });

      return NextResponse.json({
        ok: true,
        scope: "global",
        kind,
        ...result,
      });
    }

    const [voice, photo] = await Promise.all([
      processPendingVoiceNotesAcrossOrganizations({
        limitPerOrganization: limit,
        maxOrganizations,
      }),
      processPendingPhotoInspectionsAcrossOrganizations({
        limitPerOrganization: limit,
        maxOrganizations,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      scope: "global",
      kind,
      voice,
      photo,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
