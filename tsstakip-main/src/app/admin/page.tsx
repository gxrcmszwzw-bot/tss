import {
  createServiceAction,
  processPendingPhotoInspectionsAction,
  processPendingNotificationsAction,
  processPendingVoiceNotesAction,
  resolveAiAlertAction,
} from "@/app/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { ServiceGroup } from "@/components/services/ServiceGroup";
import { ServiceCreateModal } from "@/components/services/ServiceCreateModal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import {
  aiJobStatusLabels,
  aiRiskLabels,
  formatDateTime,
  notificationChannelLabels,
  notificationDeliveryStatusLabels,
  photoInspectionStatusLabels,
  subcontractorTrustGradeLabels,
} from "@/lib/labels";
import { createLookup } from "@/lib/data";
import { inRange, resolvePeriod } from "@/lib/reports";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase, profile } = await requireAdmin();
  const params = await searchParams;
  const hasAiQueueCronSecret = Boolean(process.env.AI_QUEUE_CRON_SECRET?.trim());
  const hasNotificationCronSecret = Boolean(process.env.NOTIFICATION_CRON_SECRET?.trim());
  const [
    servicesResult,
    productsResult,
    typesResult,
    membersResult,
    subcontractorsResult,
    regionsResult,
    catalogItemsResult,
    aiAlertsResult,
    voiceNotesResult,
    photoInspectionsResult,
    trustScoresResult,
    subcontractorNamesResult,
    notificationDeliveriesResult,
  ] = await Promise.all([
    supabase.from("services").select("*").order("created_at", { ascending: false }),
    supabase.from("product_groups").select("*").order("name"),
    supabase.from("service_types").select("*").order("name"),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("subcontractors").select("*").order("name"),
    supabase.from("regions").select("*").eq("is_active", true).order("name"),
    supabase.from("catalog_items").select("*").eq("is_active", true).order("name"),
    supabase.from("ai_alerts").select("*").eq("is_resolved", false).order("created_at", { ascending: false }).limit(5),
    supabase
      .from("service_voice_notes")
      .select("*")
      .in("processing_status", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .limit(8),
    supabase
      .from("service_photo_inspections")
      .select("*")
      .in("status", ["pending", "failed", "manual_review", "needs_correction"])
      .order("created_at", { ascending: true })
      .limit(8),
    supabase.from("subcontractor_trust_scores").select("*").order("score", { ascending: true }).limit(5),
    supabase.from("subcontractors").select("id,name"),
    supabase
      .from("notification_deliveries")
      .select("*")
      .in("status", ["pending", "failed", "processing"])
      .order("created_at", { ascending: true })
      .limit(8),
  ]);

  const services = servicesResult.data ?? [];
  const lookup = createLookup({
    products: productsResult.data,
    types: typesResult.data,
    members: membersResult.data,
    subcontractors: subcontractorsResult.data,
  });
  const { range: todayRange } = resolvePeriod("today");
  const todayServices = services.filter((item) => inRange(item.created_at, todayRange));
  const awaiting = services.filter((item) => item.status === "awaiting_approval");
  const completed = services.filter((item) => item.status === "completed");
  const urgent = services.filter((item) => item.priority === "urgent");
  const inProgress = services.filter((item) => item.status === "in_progress");
  const approved = services.filter((item) => item.status === "approved");
  const aiAlerts = aiAlertsResult.data ?? [];
  const voiceQueue = voiceNotesResult.data ?? [];
  const photoQueue = photoInspectionsResult.data ?? [];
  const riskScores = trustScoresResult.data ?? [];
  const subcontractorsById = new Map((subcontractorNamesResult.data ?? []).map((item) => [item.id, item.name]));
  const pendingVoiceNotes = voiceQueue.filter((item) => item.processing_status === "pending").length;
  const failedVoiceNotes = voiceQueue.filter((item) => item.processing_status === "failed").length;
  const pendingPhotoInspections = photoQueue.filter((item) => item.status === "pending").length;
  const failedPhotoInspections = photoQueue.filter((item) => item.status === "failed").length;
  const notificationQueue = notificationDeliveriesResult.data ?? [];
  const pendingNotifications = notificationQueue.filter((item) => item.status === "pending").length;
  const failedNotifications = notificationQueue.filter((item) => item.status === "failed").length;
  const processingNotifications = notificationQueue.filter((item) => item.status === "processing").length;

  const stats = [
    { label: "Bugün Açılan", value: todayServices.length },
    { label: "Onay Bekleyen", value: awaiting.length },
    { label: "Devam Eden", value: inProgress.length },
    { label: "Tamamlanan", value: completed.length },
  ];
  const statusRows = [
    { label: "Onaylandı", value: approved.length },
    { label: "Acil", value: urgent.length },
    { label: "Toplam Servis", value: services.length },
  ];

  return (
    <>
      {params.error ? (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(params.error)}
        </div>
      ) : null}
      {params.ok ? (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {decodeURIComponent(params.ok)}
        </div>
      ) : null}
      <PageHeader
        actions={
          <ServiceCreateModal
            action={createServiceAction}
            buttonLabel="Yeni Servis"
            catalogItems={catalogItemsResult.data ?? []}
            members={membersResult.data ?? []}
            products={productsResult.data ?? []}
            regions={regionsResult.data ?? []}
            role="admin"
            serviceTypes={typesResult.data ?? []}
            subcontractors={subcontractorsResult.data ?? []}
            title="Yeni Servis"
          />
        }
        subtitle="Tüm servis kayıtları, üyeler ve sistem ayarları"
        title={`Merhaba, ${profile.full_name}`}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Operasyon Özeti</h2>
              <p className="text-sm text-foreground/55">Bugünkü hareket ve açık iş yükü</p>
            </div>
            <span className="rounded-md bg-panel-muted px-2.5 py-1 text-xs font-semibold text-foreground/55">
              {new Date().toLocaleDateString("tr-TR")}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ label, value }) => (
              <div className="rounded-lg border border-border bg-background p-3" key={label}>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
          <h2 className="font-semibold">İş Yükü</h2>
          <div className="mt-3 divide-y divide-border">
            {statusRows.map((row) => (
              <div className="flex items-center justify-between py-2.5 text-sm" key={row.label}>
                <span className="text-foreground/60">{row.label}</span>
                <span className="font-semibold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-3">
        <ServiceGroup baseHref="/admin/services" lookup={lookup} services={todayServices} title="Bugün Açılanlar" />
        <ServiceGroup baseHref="/admin/services" lookup={lookup} services={awaiting} title="Onay Bekleyenler" />
        <ServiceGroup baseHref="/admin/services" lookup={lookup} services={urgent} title="Acil Servisler" />
      </section>

      <section className="mt-5 rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-semibold">Bildirim Kuyruğu</h2>
            <p className="text-sm text-foreground/55">SMS / WhatsApp teslim kayıtları ve worker durumu</p>
            <p className="mt-1 text-xs text-foreground/50">
              Arka plan endpoint: <code>/api/cron/notifications</code> · Secret durumu: {hasNotificationCronSecret ? "hazır" : "eksik"}
            </p>
          </div>
          <form action={processPendingNotificationsAction}>
            <input name="limit" type="hidden" value="10" />
            <SubmitButton
              className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
              label="Bildirim Kuyruğunu İşle"
              pendingLabel="İşleniyor..."
            />
          </form>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">Toplam</p>
            <p className="mt-2 text-2xl font-semibold">{notificationQueue.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">Bekleyen</p>
            <p className="mt-2 text-2xl font-semibold">{pendingNotifications}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">İşlenen</p>
            <p className="mt-2 text-2xl font-semibold">{processingNotifications}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">Hata</p>
            <p className="mt-2 text-2xl font-semibold">{failedNotifications}</p>
          </div>
        </div>
        {notificationQueue.length > 0 ? (
          <div className="mt-4 space-y-2">
            {notificationQueue.map((delivery) => (
              <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm" key={delivery.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {notificationChannelLabels[delivery.channel]} · {delivery.event_key}
                  </span>
                  <span className="text-foreground/60">
                    {notificationDeliveryStatusLabels[delivery.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground/55">{delivery.recipient}</p>
                <p className="mt-2 line-clamp-2 text-sm text-foreground/70">{delivery.rendered_message}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-5 rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-semibold">AI Kuyruğu</h2>
            <p className="text-sm text-foreground/55">Ses notu ve fotoğraf denetimi için bekleyen AI işleri</p>
            <p className="mt-1 text-xs text-foreground/50">
              Arka plan endpoint: <code>/api/cron/ai-queue</code> · Secret durumu: {hasAiQueueCronSecret ? "hazır" : "eksik"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={processPendingVoiceNotesAction}>
              <input name="limit" type="hidden" value="5" />
              <SubmitButton
                className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
                label="Ses Kuyruğunu İşle"
                pendingLabel="İşleniyor..."
              />
            </form>
            <form action={processPendingPhotoInspectionsAction}>
              <input name="limit" type="hidden" value="5" />
              <SubmitButton
                className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
                label="Foto Kuyruğunu İşle"
                pendingLabel="İşleniyor..."
              />
            </form>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">Toplam</p>
            <p className="mt-2 text-2xl font-semibold">{voiceQueue.length + photoQueue.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">Ses Bekleyen</p>
            <p className="mt-2 text-2xl font-semibold">{pendingVoiceNotes}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">Foto Bekleyen</p>
            <p className="mt-2 text-2xl font-semibold">{pendingPhotoInspections}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">Toplam Hata</p>
            <p className="mt-2 text-2xl font-semibold">{failedVoiceNotes + failedPhotoInspections}</p>
          </div>
        </div>
        {voiceQueue.length > 0 || photoQueue.length > 0 ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/70">Ses Notları</h3>
            {voiceQueue.map((note) => (
              <div className="rounded-lg border border-border bg-background px-3 py-3" key={note.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">Servis: {note.service_id}</p>
                  <span className="text-xs text-foreground/60">{aiJobStatusLabels[note.processing_status]}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/55">{formatDateTime(note.created_at)}</p>
                {note.processing_error ? <p className="mt-1 text-xs text-danger">{note.processing_error}</p> : null}
              </div>
            ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground/70">Foto Denetimleri</h3>
              {photoQueue.map((inspection) => (
                <div className="rounded-lg border border-border bg-background px-3 py-3" key={inspection.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">Servis: {inspection.service_id}</p>
                    <span className="text-xs text-foreground/60">{photoInspectionStatusLabels[inspection.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">{formatDateTime(inspection.created_at)}</p>
                  {inspection.summary ? <p className="mt-1 text-xs text-foreground/65">{inspection.summary}</p> : null}
                  {inspection.processing_error ? <p className="mt-1 text-xs text-danger">{inspection.processing_error}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-5 rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Taşeron Risk Görünümü</h2>
            <p className="text-sm text-foreground/55">En düşük güven skoruna sahip taşeronlar</p>
          </div>
          <a
            className="rounded-md bg-panel-muted px-2.5 py-1 text-xs font-semibold text-foreground/60 transition hover:text-accent"
            href="/admin/management"
          >
            Yönetimde aç
          </a>
        </div>
        {riskScores.length === 0 ? (
          <p className="rounded-lg bg-panel-muted px-3 py-4 text-sm text-foreground/55">
            Henüz hesaplanmış taşeron skoru yok.
          </p>
        ) : (
          <div className="space-y-2">
            {riskScores.map((score) => (
              <div className="rounded-lg border border-border bg-background px-3 py-3" key={score.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{subcontractorsById.get(score.subcontractor_id) ?? score.subcontractor_id}</p>
                  <span className="text-xs text-foreground/60">{subcontractorTrustGradeLabels[score.grade]}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/55">
                  Skor {score.score}/100 · Kalite %{score.quality_score} · Fatura %{score.invoice_match_rate}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">AI Alarmları</h2>
            <p className="text-sm text-foreground/55">Ses notu ve fotoğraf denetiminden türetilen çözülmemiş riskler</p>
          </div>
          <a
            className="rounded-md bg-panel-muted px-2.5 py-1 text-xs font-semibold text-foreground/60 transition hover:text-accent"
            href="/admin/ai-alerts"
          >
            {aiAlerts.length} açık alarm
          </a>
        </div>
        {aiAlerts.length === 0 ? (
          <p className="rounded-lg bg-panel-muted px-3 py-4 text-sm text-foreground/55">
            Şu anda açık AI alarmı yok.
          </p>
        ) : (
          <div className="space-y-2">
            {aiAlerts.map((alert) => (
              <div className="rounded-lg border border-border bg-background px-3 py-3" key={alert.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{alert.title}</p>
                  <span className="text-xs text-foreground/60">{aiRiskLabels[alert.risk_level]}</span>
                </div>
                {alert.detail ? <p className="mt-1 text-sm text-foreground/70">{alert.detail}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {alert.service_id ? (
                    <a className="inline-block text-xs font-medium text-accent hover:underline" href={`/admin/services/${alert.service_id}`}>
                      Servise git
                    </a>
                  ) : null}
                  <form action={resolveAiAlertAction} className="flex flex-wrap items-center gap-2">
                    <input name="alert_id" type="hidden" value={alert.id} />
                    <input
                      className="h-8 rounded-md border border-border bg-panel px-2 text-xs outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/20"
                      name="resolved_note"
                      placeholder="Çözüm notu"
                      required
                    />
                    <button className="text-xs font-medium text-foreground/60 transition hover:text-accent" type="submit">
                      Alarmı çöz
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
