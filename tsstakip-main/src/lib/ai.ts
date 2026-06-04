import "server-only";

import { queueNotificationEvent } from "@/lib/notifications";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AiRiskLevel, PhotoInspectionStatus, PhotoType } from "@/lib/supabase/types";

const OPENAI_API_URL = "https://api.openai.com/v1";

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY tanimli degil.");
  }
  return apiKey;
}

function getPublicPhotoUrl(storagePath: string) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!rawUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL tanimli degil.");
  }

  const supabaseUrl = rawUrl.replace(/^"|"$/g, "").replace(/\/$/, "");
  return `${supabaseUrl}/storage/v1/object/public/service-photos/${storagePath}`;
}

function deriveInspectionRiskLevel(status: PhotoInspectionStatus, score: number) {
  if (status === "needs_correction" || score <= 2) return "high";
  if (status === "manual_review" || score === 3) return "medium";
  return "low";
}

export async function analyzeVoiceNote(input: {
  voiceNoteId: string;
  storagePath: string;
}) {
  const apiKey = getOpenAiApiKey();
  const supabase = getSupabaseAdminClient();

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("service-voice-notes")
    .download(input.storagePath);

  if (downloadError || !fileData) {
    throw new Error(downloadError?.message ?? "Ses notu indirilemedi.");
  }

  await supabase
    .from("service_voice_notes")
    .update({ processing_status: "processing", processing_error: null })
    .eq("id", input.voiceNoteId);

  const transcriptionForm = new FormData();
  transcriptionForm.append("model", "gpt-4o-mini-transcribe");
  transcriptionForm.append("response_format", "text");
  transcriptionForm.append("file", fileData, "voice-note.webm");

  const transcriptionResponse = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: transcriptionForm,
  });

  if (!transcriptionResponse.ok) {
    const errorText = await transcriptionResponse.text();
    throw new Error(`Transkripsiyon basarisiz: ${errorText}`);
  }

  const transcript = await transcriptionResponse.text();
  const summaryResponse = await fetch(`${OPENAI_API_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Sen saha servis ses notlarini degerlendiren bir operasyon denetcisisin. Kisa bir ozet, risk seviyesi ve risk maddeleri cikart. JSON olarak don.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Ses notu transkripti:\n${transcript}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "voice_note_analysis",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              risk_level: { type: "string", enum: ["low", "medium", "high"] },
              risk_flags: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["summary", "risk_level", "risk_flags"],
          },
        },
      },
    }),
  });

  if (!summaryResponse.ok) {
    const errorText = await summaryResponse.text();
    throw new Error(`Risk analizi basarisiz: ${errorText}`);
  }

  const summaryPayload = (await summaryResponse.json()) as {
    output_text?: string;
  };
  const parsed = JSON.parse(summaryPayload.output_text ?? "{}") as {
    summary?: string;
    risk_level?: AiRiskLevel;
    risk_flags?: string[];
  };

  return {
    transcript,
    summary: parsed.summary ?? "",
    riskLevel: parsed.risk_level ?? "low",
    riskFlags: parsed.risk_flags ?? [],
  };
}

export async function analyzeServicePhoto(input: {
  storagePath: string;
  photoType: PhotoType;
  rubricCode?: string;
}) {
  const apiKey = getOpenAiApiKey();
  const photoUrl = getPublicPhotoUrl(input.storagePath);

  const response = await fetch(`${OPENAI_API_URL}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Sen endustriyel saha operasyon fotograflarini denetleyen bir kalite kontrol uzmanisin. Montaj duzeni, gorunur iscilik, kablo toplama, etiketleme, temizlik ve tamamlanma hissini degerlendir. 1-5 skor ver, kisa ozet yaz, bulgulari maddeleyip gerekirse duzeltme talebi olustur. Sadece JSON don.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Foto tipi: ${input.photoType}. Rubrik: ${input.rubricCode ?? "general_installation"}. Fotografi saha kalite kontrolu icin denetle.`,
            },
            {
              type: "input_image",
              image_url: photoUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "service_photo_inspection",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              score: { type: "integer", minimum: 1, maximum: 5 },
              status: {
                type: "string",
                enum: ["approved", "needs_correction", "manual_review"],
              },
              findings: {
                type: "array",
                items: { type: "string" },
              },
              correction_request: {
                type: ["string", "null"],
              },
            },
            required: ["summary", "score", "status", "findings", "correction_request"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Foto denetimi basarisiz: ${errorText}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  const parsed = JSON.parse(payload.output_text ?? "{}") as {
    summary?: string;
    score?: number;
    status?: PhotoInspectionStatus;
    findings?: string[];
    correction_request?: string | null;
  };

  return {
    summary: parsed.summary ?? "",
    score: Math.min(5, Math.max(1, Math.round(parsed.score ?? 3))),
    status: (parsed.status ?? "manual_review") as Exclude<
      PhotoInspectionStatus,
      "pending" | "processing" | "failed"
    >,
    findings: parsed.findings ?? [],
    correctionRequest: parsed.correction_request ?? null,
  };
}

export async function processVoiceNoteAnalysis(input: {
  organizationId: string;
  serviceId: string;
  voiceNoteId: string;
  storagePath: string;
}) {
  const supabase = getSupabaseAdminClient();

  try {
    const result = await analyzeVoiceNote({
      voiceNoteId: input.voiceNoteId,
      storagePath: input.storagePath,
    });

    const { error: updateError } = await supabase
      .from("service_voice_notes")
      .update({
        transcript: result.transcript,
        summary: result.summary,
        risk_level: result.riskLevel,
        risk_flags: result.riskFlags,
        processing_status: "completed",
        processing_error: null,
      })
      .eq("id", input.voiceNoteId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (result.riskLevel !== "low") {
      const { error: alertError } = await supabase.from("ai_alerts").insert({
        organization_id: input.organizationId,
        service_id: input.serviceId,
        voice_note_id: input.voiceNoteId,
        title:
          result.riskLevel === "high"
            ? "Yuksek riskli ses notu"
            : "Incelenmesi gereken ses notu",
        detail: result.summary,
        risk_level: result.riskLevel,
      });

      if (alertError) {
        throw new Error(alertError.message);
      }
    }

    return { ok: true as const, riskLevel: result.riskLevel };
  } catch (error) {
    await supabase
      .from("service_voice_notes")
      .update({
        processing_status: "failed",
        processing_error: error instanceof Error ? error.message : String(error),
      })
      .eq("id", input.voiceNoteId);

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function processPendingVoiceNotes(input: {
  organizationId: string;
  limit?: number;
}) {
  const supabase = getSupabaseAdminClient();
  const limit = input.limit ?? 5;

  const { data: notes, error } = await supabase
    .from("service_voice_notes")
    .select("id,service_id,storage_path,processing_status")
    .eq("organization_id", input.organizationId)
    .in("processing_status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const results = [];
  for (const note of notes ?? []) {
    const result = await processVoiceNoteAnalysis({
      organizationId: input.organizationId,
      serviceId: note.service_id,
      voiceNoteId: note.id,
      storagePath: note.storage_path,
    });
    results.push({ voiceNoteId: note.id, ...result });
  }

  return {
    processed: results.length,
    succeeded: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

export async function processPendingVoiceNotesAcrossOrganizations(input?: {
  limitPerOrganization?: number;
  maxOrganizations?: number;
}) {
  const supabase = getSupabaseAdminClient();
  const limitPerOrganization = input?.limitPerOrganization ?? 5;
  const maxOrganizations = input?.maxOrganizations ?? 10;

  const { data: notes, error } = await supabase
    .from("service_voice_notes")
    .select("organization_id,created_at")
    .in("processing_status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(Math.max(limitPerOrganization * maxOrganizations, maxOrganizations));

  if (error) {
    throw new Error(error.message);
  }

  const organizationIds = Array.from(
    new Set((notes ?? []).map((note) => note.organization_id).filter(Boolean)),
  ).slice(0, maxOrganizations);

  const organizations = [];
  for (const organizationId of organizationIds) {
    const result = await processPendingVoiceNotes({
      organizationId,
      limit: limitPerOrganization,
    });
    organizations.push({
      organizationId,
      ...result,
    });
  }

  return {
    organizationsProcessed: organizations.length,
    processed: organizations.reduce((sum, item) => sum + item.processed, 0),
    succeeded: organizations.reduce((sum, item) => sum + item.succeeded, 0),
    failed: organizations.reduce((sum, item) => sum + item.failed, 0),
    organizations,
  };
}

export async function processPhotoInspection(input: {
  organizationId: string;
  serviceId: string;
  photoId: string;
  inspectionId: string;
  storagePath: string;
  photoType: PhotoType;
  rubricCode?: string | null;
}) {
  const supabase = getSupabaseAdminClient();

  try {
    await supabase
      .from("service_photo_inspections")
      .update({
        status: "processing",
        processing_error: null,
      })
      .eq("id", input.inspectionId);

    const result = await analyzeServicePhoto({
      storagePath: input.storagePath,
      photoType: input.photoType,
      rubricCode: input.rubricCode ?? undefined,
    });

    const reviewedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("service_photo_inspections")
      .update({
        score: result.score,
        summary: result.summary,
        findings: result.findings,
        correction_request: result.correctionRequest,
        status: result.status,
        processing_error: null,
        reviewed_at: reviewedAt,
      })
      .eq("id", input.inspectionId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const riskLevel = deriveInspectionRiskLevel(result.status, result.score);
    if (riskLevel !== "low") {
      const { error: alertError } = await supabase.from("ai_alerts").insert({
        organization_id: input.organizationId,
        service_id: input.serviceId,
        title:
          result.status === "needs_correction"
            ? "Fotoğraf denetiminde düzeltme gerekli"
            : "Fotoğraf denetimi manuel inceleme istiyor",
        detail: result.correctionRequest ?? result.summary,
        risk_level: riskLevel,
      });

      if (alertError) {
        throw new Error(alertError.message);
      }
    }

    if (result.status === "needs_correction") {
      const { data: service } = await supabase
        .from("services")
        .select("subcontractor_id,subcontractor_phone,service_number,customer_name")
        .eq("id", input.serviceId)
        .maybeSingle();

      await queueNotificationEvent({
        organizationId: input.organizationId,
        eventKey: "photo_correction_requested",
        serviceId: input.serviceId,
        subcontractorId: service?.subcontractor_id ?? null,
        recipient: service?.subcontractor_phone ?? null,
        payload: {
          service_number: service?.service_number ?? input.serviceId,
          customer_name: service?.customer_name ?? "",
          correction_request: result.correctionRequest ?? result.summary,
        },
        channels: ["whatsapp", "sms"],
      });
    }

    return {
      ok: true as const,
      status: result.status,
      score: result.score,
    };
  } catch (error) {
    await supabase
      .from("service_photo_inspections")
      .update({
        status: "failed",
        processing_error: error instanceof Error ? error.message : String(error),
      })
      .eq("id", input.inspectionId);

    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function processPendingPhotoInspections(input: {
  organizationId: string;
  limit?: number;
}) {
  const supabase = getSupabaseAdminClient();
  const limit = input.limit ?? 5;

  const { data: inspections, error } = await supabase
    .from("service_photo_inspections")
    .select("id,service_id,photo_id,photo_type,rubric_code")
    .eq("organization_id", input.organizationId)
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const results = [];
  for (const inspection of inspections ?? []) {
    const { data: photo, error: photoError } = await supabase
      .from("service_photos")
      .select("storage_path")
      .eq("id", inspection.photo_id)
      .maybeSingle();

    if (photoError || !photo) {
      await supabase
        .from("service_photo_inspections")
        .update({
          status: "failed",
          processing_error: photoError?.message ?? "Denetim fotografi bulunamadi.",
        })
        .eq("id", inspection.id);
      results.push({
        photoInspectionId: inspection.id,
        ok: false as const,
        error: photoError?.message ?? "Denetim fotografi bulunamadi.",
      });
      continue;
    }

    const result = await processPhotoInspection({
      organizationId: input.organizationId,
      serviceId: inspection.service_id,
      photoId: inspection.photo_id,
      inspectionId: inspection.id,
      storagePath: photo.storage_path,
      photoType: inspection.photo_type,
      rubricCode: inspection.rubric_code,
    });
    results.push({ photoInspectionId: inspection.id, ...result });
  }

  return {
    processed: results.length,
    succeeded: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

export async function processPendingPhotoInspectionsAcrossOrganizations(input?: {
  limitPerOrganization?: number;
  maxOrganizations?: number;
}) {
  const supabase = getSupabaseAdminClient();
  const limitPerOrganization = input?.limitPerOrganization ?? 5;
  const maxOrganizations = input?.maxOrganizations ?? 10;

  const { data: inspections, error } = await supabase
    .from("service_photo_inspections")
    .select("organization_id")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(Math.max(limitPerOrganization * maxOrganizations, maxOrganizations));

  if (error) {
    throw new Error(error.message);
  }

  const organizationIds = Array.from(
    new Set((inspections ?? []).map((item) => item.organization_id).filter(Boolean)),
  ).slice(0, maxOrganizations);

  const organizations = [];
  for (const organizationId of organizationIds) {
    const result = await processPendingPhotoInspections({
      organizationId,
      limit: limitPerOrganization,
    });
    organizations.push({
      organizationId,
      ...result,
    });
  }

  return {
    organizationsProcessed: organizations.length,
    processed: organizations.reduce((sum, item) => sum + item.processed, 0),
    succeeded: organizations.reduce((sum, item) => sum + item.succeeded, 0),
    failed: organizations.reduce((sum, item) => sum + item.failed, 0),
    organizations,
  };
}
