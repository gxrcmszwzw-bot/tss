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
