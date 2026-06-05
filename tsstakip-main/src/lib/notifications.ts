import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NotificationChannel } from "@/lib/supabase/types";

function renderTemplate(template: string, payload: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return payload[key] ?? "";
  });
}

export async function queueNotificationEvent(input: {
  organizationId: string;
  eventKey: string;
  serviceId?: string | null;
  subcontractorId?: string | null;
  recipient: string | null;
  payload: Record<string, string>;
  channels?: NotificationChannel[];
}) {
  if (!input.recipient) return { queued: 0 };

  const supabase = getSupabaseAdminClient();
  const channels = input.channels ?? ["sms", "whatsapp"];

  const { data: templates, error } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("event_key", input.eventKey)
    .eq("is_active", true)
    .in("channel", channels);

  if (error) {
    throw new Error(error.message);
  }

  const deliveries = (templates ?? []).map((template) => ({
    organization_id: input.organizationId,
    service_id: input.serviceId ?? null,
    subcontractor_id: input.subcontractorId ?? null,
    channel: template.channel,
    event_key: input.eventKey,
    recipient: input.recipient!,
    rendered_message: renderTemplate(template.body_template, input.payload),
    payload: input.payload,
    status: "pending" as const,
  }));

  if (deliveries.length === 0) {
    return { queued: 0 };
  }

  const { error: insertError } = await supabase
    .from("notification_deliveries")
    .insert(deliveries);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { queued: deliveries.length };
}

function resolveNotificationMode() {
  return (process.env.NOTIFICATION_DELIVERY_MODE ?? "log").trim().toLowerCase();
}

async function deliverNotification(delivery: {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  rendered_message: string;
  processing_attempts: number;
}) {
  const mode = resolveNotificationMode();

  if (!delivery.recipient.trim()) {
    return {
      status: "failed" as const,
      errorMessage: "Alici bilgisi bos.",
      providerResponse: { mode, reason: "missing_recipient" },
    };
  }

  if (mode === "disabled") {
    return {
      status: "canceled" as const,
      errorMessage: "Notification delivery mode disabled.",
      providerResponse: { mode },
    };
  }

  const providerMessageId = `${delivery.channel}_${delivery.id}_${Date.now()}`;
  return {
    status: "sent" as const,
    sentAt: new Date().toISOString(),
    providerMessageId,
    providerResponse: {
      mode,
      channel: delivery.channel,
      recipient: delivery.recipient,
      messagePreview: delivery.rendered_message.slice(0, 160),
      attempts: delivery.processing_attempts + 1,
    },
  };
}

export async function processPendingNotifications(input?: { limit?: number }) {
  const supabase = getSupabaseAdminClient();
  const limit = Math.min(Math.max(input?.limit ?? 10, 1), 50);

  const { data: deliveries, error } = await supabase
    .from("notification_deliveries")
    .select("id,channel,recipient,rendered_message,processing_attempts,status")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let canceled = 0;

  for (const delivery of deliveries ?? []) {
    const attemptCount = (delivery.processing_attempts ?? 0) + 1;
    await supabase
      .from("notification_deliveries")
      .update({
        status: "processing",
        processing_attempts: attemptCount,
        last_attempt_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", delivery.id);

    const result = await deliverNotification({
      id: delivery.id,
      channel: delivery.channel,
      recipient: delivery.recipient,
      rendered_message: delivery.rendered_message,
      processing_attempts: delivery.processing_attempts ?? 0,
    });

    const { error: updateError } = await supabase
      .from("notification_deliveries")
      .update({
        status: result.status,
        sent_at: "sentAt" in result ? result.sentAt : null,
        provider_message_id: "providerMessageId" in result ? result.providerMessageId : null,
        provider_response: result.providerResponse,
        error_message: "errorMessage" in result ? result.errorMessage : null,
      })
      .eq("id", delivery.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    processed += 1;
    if (result.status === "sent") sent += 1;
    if (result.status === "failed") failed += 1;
    if (result.status === "canceled") canceled += 1;
  }

  return { processed, sent, failed, canceled };
}
