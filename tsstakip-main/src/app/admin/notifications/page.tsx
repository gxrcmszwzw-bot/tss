import Link from "next/link";

import { processPendingNotificationsAction, retryNotificationDeliveryAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, notificationChannelLabels, notificationDeliveryStatusLabels } from "@/lib/labels";
import type { NotificationDeliveryStatus } from "@/lib/supabase/types";

type NotificationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  const params = searchParams ? await searchParams : {};
  const statusOptions: Array<NotificationDeliveryStatus | "all"> = ["all", "pending", "processing", "failed", "sent", "canceled"];
  const requestedStatus = typeof params.status === "string" ? params.status : "all";
  const statusParam = statusOptions.includes(requestedStatus as NotificationDeliveryStatus | "all")
    ? (requestedStatus as NotificationDeliveryStatus | "all")
    : "all";

  let query = supabase
    .from("notification_deliveries")
    .select("id,service_id,channel,event_key,recipient,rendered_message,status,error_message,created_at,last_attempt_at,sent_at,processing_attempts")
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeOrganizationId) {
    query = query.eq("organization_id", activeOrganizationId);
  }

  if (statusParam !== "all") {
    query = query.eq("status", statusParam);
  }

  const { data: deliveries } = await query;
  const list = deliveries ?? [];
  const counts = {
    all: list.length,
    pending: list.filter((item) => item.status === "pending").length,
    processing: list.filter((item) => item.status === "processing").length,
    failed: list.filter((item) => item.status === "failed").length,
    sent: list.filter((item) => item.status === "sent").length,
    canceled: list.filter((item) => item.status === "canceled").length,
  };

  return (
    <>
      <PageHeader
        title="Bildirim Merkezi"
        subtitle="SMS ve WhatsApp teslimlerini izle, filtrele ve yeniden dene"
        actions={(
          <form action={processPendingNotificationsAction}>
            <input name="limit" type="hidden" value="20" />
            <SubmitButton
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:border-accent/40 hover:text-accent"
              label="Kuyruğu İşle"
              pendingLabel="İşleniyor..."
            />
          </form>
        )}
      />

      <section className="grid gap-3 md:grid-cols-6">
        {[
          ["all", "Toplam", counts.all],
          ["pending", "Bekleyen", counts.pending],
          ["processing", "İşleniyor", counts.processing],
          ["failed", "Hata", counts.failed],
          ["sent", "Gönderildi", counts.sent],
          ["canceled", "İptal", counts.canceled],
        ].map(([key, label, value]) => (
          <Link
            className={`rounded-xl border px-4 py-3 text-sm transition ${
              statusParam === key ? "border-accent bg-accent/10 text-accent" : "border-border bg-panel hover:border-accent/30"
            }`}
            href={key === "all" ? "/admin/notifications" : `/admin/notifications?status=${key}`}
            key={key}
          >
            <p className="text-xs uppercase tracking-wide text-foreground/45">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          </Link>
        ))}
      </section>

      <section className="mt-5 space-y-3">
        {list.length === 0 ? (
          <div className="rounded-xl border border-border bg-panel p-6 text-sm text-foreground/55">
            Bu filtrede bildirim kaydı yok.
          </div>
        ) : (
          list.map((delivery) => (
            <article className="rounded-xl border border-border bg-panel p-4" key={delivery.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-foreground">
                      {notificationChannelLabels[delivery.channel]} · {delivery.event_key}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground/60">
                      {notificationDeliveryStatusLabels[delivery.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60">{delivery.recipient}</p>
                  <p className="mt-2 text-sm text-foreground/80">{delivery.rendered_message}</p>
                </div>

                {(delivery.status === "failed" || delivery.status === "canceled" || delivery.status === "pending") ? (
                  <form action={retryNotificationDeliveryAction}>
                    <input name="delivery_id" type="hidden" value={delivery.id} />
                    <SubmitButton
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:border-accent/40 hover:text-accent"
                      label="Yeniden Dene"
                      pendingLabel="Deneniyor..."
                    />
                  </form>
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 text-xs text-foreground/55 md:grid-cols-4">
                <p>Oluşturuldu: {formatDateTime(delivery.created_at)}</p>
                <p>Son deneme: {formatDateTime(delivery.last_attempt_at)}</p>
                <p>Gönderildi: {formatDateTime(delivery.sent_at)}</p>
                <p>Denenme sayısı: {delivery.processing_attempts ?? 0}</p>
              </div>

              {delivery.error_message ? (
                <p className="mt-3 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {delivery.error_message}
                </p>
              ) : null}
            </article>
          ))
        )}
      </section>
    </>
  );
}
