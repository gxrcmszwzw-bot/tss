import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, NotificationChannel } from "@/lib/supabase/types";

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

function resolveNotificationWebhookUrl(channel: NotificationChannel) {
  if (channel === "sms") {
    return process.env.NOTIFICATION_WEBHOOK_SMS_URL?.trim() ?? "";
  }

  if (channel === "whatsapp") {
    return process.env.NOTIFICATION_WEBHOOK_WHATSAPP_URL?.trim() ?? "";
  }

  return "";
}

function buildNotificationWebhookHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authHeader = process.env.NOTIFICATION_WEBHOOK_AUTH_HEADER?.trim();
  const authToken = process.env.NOTIFICATION_WEBHOOK_AUTH_TOKEN?.trim();

  if (authHeader && authToken) {
    headers[authHeader] = authToken;
  } else if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

function normalizeJsonValue(value: unknown): Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const result: Record<string, Json> = {};

    for (const [key, entry] of Object.entries(value)) {
      result[key] = normalizeJsonValue(entry);
    }

    return result;
  }

  return String(value);
}

async function deliverNotification(delivery: {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  rendered_message: string;
  processing_attempts: number;
  eventKey: string;
  serviceId?: string | null;
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

  if (mode === "webhook") {
    const webhookUrl = resolveNotificationWebhookUrl(delivery.channel);

    if (!webhookUrl) {
      return {
        status: "failed" as const,
        errorMessage: `${delivery.channel} icin webhook URL tanimli degil.`,
        providerResponse: { mode, reason: "missing_webhook_url", channel: delivery.channel },
      };
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: buildNotificationWebhookHeaders(),
      body: JSON.stringify({
        delivery_id: delivery.id,
        channel: delivery.channel,
        recipient: delivery.recipient,
        message: delivery.rendered_message,
        event_key: delivery.eventKey,
        service_id: delivery.serviceId ?? null,
        attempts: delivery.processing_attempts + 1,
      }),
      cache: "no-store",
    });

    const rawBody = await response.text();
    let parsedBody: Json = rawBody;

    if (rawBody) {
      try {
        parsedBody = normalizeJsonValue(JSON.parse(rawBody));
      } catch {
        parsedBody = rawBody;
      }
    }

    if (!response.ok) {
      return {
        status: "failed" as const,
        errorMessage: `Webhook delivery failed with status ${response.status}.`,
        providerResponse: {
          mode,
          webhookUrl,
          status: response.status,
          body: parsedBody,
        },
      };
    }

    const providerMessageId =
      typeof parsedBody === "object" &&
      parsedBody !== null &&
      "message_id" in parsedBody &&
      typeof (parsedBody as { message_id?: unknown }).message_id === "string"
        ? ((parsedBody as { message_id: string }).message_id)
        : `${delivery.channel}_${delivery.id}_${Date.now()}`;

    return {
      status: "sent" as const,
      sentAt: new Date().toISOString(),
      providerMessageId,
      providerResponse: {
        mode,
        webhookUrl,
        status: response.status,
        body: parsedBody,
      },
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

async function processDeliveryById(deliveryId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: delivery, error } = await supabase
    .from("notification_deliveries")
    .select("id,channel,recipient,rendered_message,processing_attempts,status,event_key,service_id")
    .eq("id", deliveryId)
    .maybeSingle();

  if (error || !delivery) {
    throw new Error(error?.message ?? "Bildirim teslim kaydi bulunamadi.");
  }

  const attemptCount = (delivery.processing_attempts ?? 0) + 1;
  const { error: markProcessingError } = await supabase
    .from("notification_deliveries")
    .update({
      status: "processing",
      processing_attempts: attemptCount,
      last_attempt_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", delivery.id);

  if (markProcessingError) {
    throw new Error(markProcessingError.message);
  }

  const result = await deliverNotification({
    id: delivery.id,
    channel: delivery.channel,
    recipient: delivery.recipient,
    rendered_message: delivery.rendered_message,
    processing_attempts: delivery.processing_attempts ?? 0,
    eventKey: delivery.event_key,
    serviceId: delivery.service_id,
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

  return result;
}

export async function processPendingNotifications(input?: { limit?: number }) {
  const supabase = getSupabaseAdminClient();
  const limit = Math.min(Math.max(input?.limit ?? 10, 1), 50);

  const { data: deliveries, error } = await supabase
    .from("notification_deliveries")
    .select("id,channel,recipient,rendered_message,processing_attempts,status,event_key,service_id")
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
    const result = await processDeliveryById(delivery.id);

    processed += 1;
    if (result.status === "sent") sent += 1;
    if (result.status === "failed") failed += 1;
    if (result.status === "canceled") canceled += 1;
  }

  return { processed, sent, failed, canceled };
}

export async function retryNotificationDelivery(deliveryId: string) {
  return processDeliveryById(deliveryId);
}

export async function sendTestNotification(input: {
  organizationId: string;
  templateId: string;
  recipient: string;
}) {
  const supabase = getSupabaseAdminClient();

  const { data: template, error } = await supabase
    .from("notification_templates")
    .select("id,organization_id,event_key,channel,template_name,body_template,is_active")
    .eq("id", input.templateId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (error || !template) {
    throw new Error(error?.message ?? "Bildirim sablonu bulunamadi.");
  }

  if (!template.is_active) {
    throw new Error("Pasif sablon icin test gonderimi yapilamaz.");
  }

  const payload = {
    customer_name: "Test Musterisi",
    service_number: "SRV-TEST-001",
    subcontractor_name: "Test Taseron",
    tracking_url: "https://example.com/track/test",
    note: "Bu bir test bildirimidir.",
  };

  const renderedMessage = renderTemplate(template.body_template, payload);

  const { data: delivery, error: insertError } = await supabase
    .from("notification_deliveries")
    .insert({
      organization_id: input.organizationId,
      channel: template.channel,
      event_key: `${template.event_key}_test`,
      recipient: input.recipient.trim(),
      rendered_message: renderedMessage,
      payload,
      status: "processing",
      processing_attempts: 1,
      last_attempt_at: new Date().toISOString(),
    })
    .select("id,channel,recipient,rendered_message,event_key,service_id")
    .single();

  if (insertError || !delivery) {
    throw new Error(insertError?.message ?? "Test bildirimi kaydi olusturulamadi.");
  }

  const result = await deliverNotification({
    id: delivery.id,
    channel: delivery.channel,
    recipient: delivery.recipient,
    rendered_message: delivery.rendered_message,
    processing_attempts: 0,
    eventKey: delivery.event_key,
    serviceId: delivery.service_id,
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

  return {
    deliveryId: delivery.id,
    status: result.status,
  };
}
