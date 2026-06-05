import { Trash2 } from "lucide-react";

import {
  analyzeServicePhotoInspectionAction,
  analyzeServiceVoiceNoteAction,
  createServiceInvoiceAction,
  createServiceNegotiationAction,
  createServiceVoiceNoteAction,
  deleteServiceAction,
  deleteServiceInvoiceAction,
  deleteServicePhotoAction,
  initializeServiceFinanceAction,
  processPendingPhotoInspectionsAction,
  requestServicePhotoInspectionAction,
  startServiceWithGeofenceAction,
  updateServiceTrackingSettingsAction,
  updateServiceAction,
  updateServiceStatusAction,
} from "@/app/actions";
import { InvoiceUploadField } from "@/components/services/InvoiceUploadField";
import { LiveLocationPublisher } from "@/components/services/LiveLocationPublisher";
import { PhotoCapture } from "@/components/services/PhotoCapture";
import { ServiceForm } from "@/components/services/ServiceForm";
import { StartServiceButton } from "@/components/services/StartServiceButton";
import { StatusBadge } from "@/components/services/StatusBadge";
import { VoiceNoteUploadField } from "@/components/services/VoiceNoteUploadField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type {
  ProductGroup,
  Profile,
  Region,
  Service,
  CatalogItem,
  ServiceVoiceNote,
  ServiceInvoice,
  ServiceNegotiation,
  ServicePhoto,
  ServicePhotoInspection,
  ServiceType,
  Subcontractor,
} from "@/lib/data";
import {
  aiRiskLabels,
  aiJobStatusLabels,
  feeLabels,
  financeStatusLabels,
  formatCurrency,
  formatDateTime,
  invoiceMatchLabels,
  negotiationStatusLabels,
  photoInspectionStatusLabels,
  priorityLabels,
  teamLabels,
} from "@/lib/labels";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function photoUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/service-photos/${storagePath}`;
}

const photoTypeLabels: Record<string, string> = {
  start: "Başlangıç",
  end: "Bitiş",
  during: "Ara",
};

type ServiceDetailProps = {
  service: Service;
  products: ProductGroup[];
  catalogItems: CatalogItem[];
  regions: Region[];
  serviceTypes: ServiceType[];
  members: Profile[];
  subcontractors: Subcontractor[];
  photos: ServicePhoto[];
  photoInspections?: ServicePhotoInspection[];
  negotiations?: ServiceNegotiation[];
  invoices?: ServiceInvoice[];
  voiceNotes?: ServiceVoiceNote[];
  role: "admin" | "member";
  galleryEnabled?: boolean;
};

const statusActions: [string, string][] = [
  ["completed", "Tamamlandı"],
  ["approved", "Onayla"],
  ["rejected", "Reddet"],
];

function photoDisabledReason(role: "admin" | "member", status: Service["status"], photoType: "start" | "end" | "during") {
  if (role === "admin") return undefined;
  if (status === "rejected" || status === "canceled") return "Bu servis için fotoğraf eklenemez.";
  if (photoType === "start" && status !== "approved") return "Başlangıç fotoğrafı için servis onaylanmış olmalı.";
  if (photoType === "end" && status !== "in_progress") return "Bitiş fotoğrafı için servis başlamış olmalı.";
  if (photoType === "during" && status !== "in_progress") return "Ara fotoğraf için servis başlamış olmalı.";
  return undefined;
}

export function ServiceDetail({
  service,
  products,
  catalogItems,
  regions,
  serviceTypes,
  members,
  subcontractors,
  photos,
  photoInspections = [],
  negotiations = [],
  invoices = [],
  voiceNotes = [],
  role,
  galleryEnabled = true,
}: ServiceDetailProps) {
  const product = products.find((item) => item.id === service.product_group_id);
  const region = regions.find((item) => item.id === service.region_id);
  const catalogItem = catalogItems.find((item) => item.id === service.catalog_item_id);
  const type = serviceTypes.find((item) => item.id === service.service_type_id);
  const member = members.find((item) => item.id === service.member_id);
  const photoInspectionByPhotoId = new Map(
    photoInspections.map((inspection) => [inspection.photo_id, inspection]),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-4">

        {/* Info card */}
        <Card>
          <div className="flex flex-wrap items-start gap-2">
            <h2 className="flex-1 text-xl font-bold">{service.customer_name}</h2>
            <span className="rounded-md bg-panel-muted px-2.5 py-1 text-sm font-semibold text-foreground/70">
              {service.service_number}
            </span>
            <StatusBadge status={service.status} />
          </div>
          <dl className="mt-4 divide-y divide-border text-sm">
            <Row label="Servis No" value={service.service_number} />
            <Row label="Telefon" value={service.customer_phone} />
            <Row label="Adres" value={service.address} />
            <Row label="İlçe" value={service.district ?? "—"} />
            <Row label="Site ID" value={service.site_id} />
            <Row label="Proje" value={service.project_name ?? "—"} />
            <Row
              label="Geofence"
              value={
                service.service_latitude !== null && service.service_longitude !== null
                  ? `${service.service_latitude.toFixed(5)}, ${service.service_longitude.toFixed(5)} · ${service.geofence_radius_meters} m`
                  : "Tanımlı değil"
              }
            />
            <Row label="Ürün Grubu" value={product?.name ?? "—"} />
            <Row label="Bölge" value={region?.name ?? "—"} />
            <Row label="Servis Tipi" value={type?.name ?? "—"} />
            <Row label="İş Kalemi" value={catalogItem?.name ?? "—"} />
            <Row label="Ekip Tipi" value={teamLabels[service.team_type]} />
            <Row label="Üye" value={member?.full_name ?? "—"} />
            {service.team_type === "subcontractor" ? (
              <>
                <Row label="Taşeron" value={subcontractors.find((item) => item.id === service.subcontractor_id)?.name ?? "—"} />
                <Row label="Sorumlu" value={service.subcontractor_contact ?? "—"} />
                <Row label="Taşeron Tel" value={service.subcontractor_phone ?? "—"} />
              </>
            ) : null}
            <Row label="Öncelik" value={priorityLabels[service.priority]} />
            <Row label="Planlanan" value={formatDateTime(service.scheduled_at)} />
            <Row label="Ücret" value={`${feeLabels[service.fee_type]} · ${formatCurrency(service.amount, service.currency)}`} />
          </dl>
        </Card>

        {/* Timeline card */}
        <Card title="Zaman Takibi">
          <dl className="divide-y divide-border text-sm">
            <Row label="Başlangıç" value={formatDateTime(service.started_at)} />
            <Row label="Bitiş" value={formatDateTime(service.completed_at)} />
            <Row label="Onay Gönderimi" value={formatDateTime(service.customer_approval_sent_at)} />
            <Row label="Son Konum" value={formatDateTime(service.technician_last_seen_at)} />
            <Row
              label="ETA"
              value={
                service.technician_arrived_at
                  ? "Lokasyona ulaştı"
                  : service.technician_eta_minutes !== null
                    ? `${service.technician_eta_minutes} dk`
                    : "-"
              }
            />
          </dl>
        </Card>

        <Card title="Canlı Takip">
          <dl className="divide-y divide-border text-sm">
            <Row label="Public Takip" value={service.public_tracking_enabled ? "Aktif" : "Kapalı"} />
            <Row
              label="Takip Linki"
              value={
                service.public_tracking_enabled
                  ? `/track/${service.public_tracking_token}`
                  : "Henüz aktif değil"
              }
            />
            <Row
              label="Ekip Konumu"
              value={
                service.technician_last_latitude !== null && service.technician_last_longitude !== null
                  ? `${service.technician_last_latitude.toFixed(5)}, ${service.technician_last_longitude.toFixed(5)}`
                  : "Henüz paylaşılmadı"
              }
            />
          </dl>
          {service.public_tracking_enabled ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
                href={`/track/${service.public_tracking_token}`}
                rel="noreferrer"
                target="_blank"
              >
                Public Takip Sayfasını Aç
              </a>
            </div>
          ) : null}
          {role === "admin" ? (
            <form action={updateServiceTrackingSettingsAction} className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-[1fr_180px_auto]">
              <input name="service_id" type="hidden" value={service.id} />
              <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
                <input
                  defaultChecked={service.public_tracking_enabled}
                  name="public_tracking_enabled"
                  type="checkbox"
                />
                Public takip aktif olsun
              </label>
              <Field
                label="ETA (dk)"
                name="technician_eta_minutes"
                type="number"
                value={service.technician_eta_minutes?.toString()}
              />
              <div className="flex items-end">
                <SubmitButton
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-panel px-4 text-sm font-semibold text-foreground"
                  label="Takibi Kaydet"
                  pendingLabel="Kaydediliyor..."
                />
              </div>
            </form>
          ) : null}
          {role === "member" && service.status === "in_progress" ? (
            <div className="mt-4 border-t border-border pt-4">
              <LiveLocationPublisher enabled serviceId={service.id} />
            </div>
          ) : null}
        </Card>

        {service.status === "approved" ? (
          <StartServiceButton
            action={startServiceWithGeofenceAction}
            radiusMeters={service.geofence_radius_meters}
            serviceId={service.id}
            targetLatitude={service.service_latitude}
            targetLongitude={service.service_longitude}
          />
        ) : null}

        <Card title="Finans Özeti">
          <dl className="divide-y divide-border text-sm">
            <Row label="Finans Durumu" value={financeStatusLabels[service.finance_status]} />
            <Row label="Standart Fiyat" value={formatCurrency(service.standard_price_snapshot, service.currency)} />
            <Row label="Çarpan" value={service.regional_multiplier_snapshot?.toString() ?? "-"} />
            <Row label="Beklenen Gelir" value={formatCurrency(service.expected_revenue, service.currency)} />
            <Row label="Pazarlık" value={formatCurrency(service.negotiated_cost, service.currency)} />
            <Row label="Onaylı Maliyet" value={formatCurrency(service.approved_cost, service.currency)} />
            <Row label="Tahmini Marj" value={formatCurrency(service.margin_estimate, service.currency)} />
          </dl>
        </Card>

        {/* Photos card */}
        <Card title="Fotoğraflar">
          <div className="space-y-3">
            <PhotoCapture
              organizationId={service.organization_id}
              disabledReason={photoDisabledReason(role, service.status, "start")}
              galleryEnabled={galleryEnabled}
              label="Başlangıç Fotoğrafı"
              photoType="start"
              serviceId={service.id}
              serviceStatus={service.status}
            />
            <PhotoCapture
              organizationId={service.organization_id}
              disabledReason={photoDisabledReason(role, service.status, "end")}
              galleryEnabled={galleryEnabled}
              label="Bitiş Fotoğrafı"
              photoType="end"
              serviceId={service.id}
              serviceStatus={service.status}
            />
            <PhotoCapture
              organizationId={service.organization_id}
              disabledReason={photoDisabledReason(role, service.status, "during")}
              galleryEnabled={galleryEnabled}
              label="Ara Fotoğraf"
              photoType="during"
              serviceId={service.id}
              serviceStatus={service.status}
            />
          </div>
          {photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              {photos.map((photo) => {
                const inspection = photoInspectionByPhotoId.get(photo.id);

                return (
                <div
                  className="group relative overflow-hidden rounded-lg border border-border bg-panel-muted"
                  key={photo.id}
                >
                  <a
                    className="block"
                    href={photoUrl(photo.storage_path)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={photoTypeLabels[photo.photo_type] ?? photo.photo_type}
                      className="aspect-video w-full object-cover transition group-hover:opacity-90"
                      loading="lazy"
                      src={photoUrl(photo.storage_path)}
                    />
                  </a>
                  <div className="flex items-center justify-between gap-2 px-2 py-1">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground/70">
                        {photoTypeLabels[photo.photo_type] ?? photo.photo_type}
                      </p>
                      {inspection ? (
                        <p className="truncate text-[11px] text-foreground/55">
                          {photoInspectionStatusLabels[inspection.status]}
                          {inspection.score !== null ? ` · ${inspection.score}/5` : ""}
                        </p>
                      ) : (
                        <p className="text-[11px] text-foreground/45">Henüz denetlenmedi</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {role === "admin" ? (
                        inspection ? (
                          <form action={analyzeServicePhotoInspectionAction}>
                            <input name="inspection_id" type="hidden" value={inspection.id} />
                            <input name="service_id" type="hidden" value={service.id} />
                            <input name="photo_id" type="hidden" value={photo.id} />
                            <SubmitButton
                              className="rounded-md border border-border bg-panel px-2 py-1 text-[11px] font-medium text-foreground transition hover:border-accent/40 hover:text-accent"
                              label="Denetle"
                              pendingLabel="..."
                            />
                          </form>
                        ) : (
                          <form action={requestServicePhotoInspectionAction}>
                            <input name="service_id" type="hidden" value={service.id} />
                            <input name="photo_id" type="hidden" value={photo.id} />
                            <input name="photo_type" type="hidden" value={photo.photo_type} />
                            <SubmitButton
                              className="rounded-md border border-border bg-panel px-2 py-1 text-[11px] font-medium text-foreground transition hover:border-accent/40 hover:text-accent"
                              label="Kuyruğa Al"
                              pendingLabel="..."
                            />
                          </form>
                        )
                      ) : null}
                      <form action={deleteServicePhotoAction}>
                        <input name="id" type="hidden" value={photo.id} />
                        <input name="service_id" type="hidden" value={service.id} />
                        <input name="storage_path" type="hidden" value={photo.storage_path} />
                        <SubmitButton
                          aria-label="Fotoğrafı sil"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/40 transition active:scale-90 hover:bg-danger/10 hover:text-danger"
                          pendingLabel={null}
                          title="Fotoğrafı sil"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                  {inspection?.summary ? (
                    <div className="border-t border-border px-2 py-2">
                      <p className="text-xs text-foreground/65">{inspection.summary}</p>
                      {inspection.correction_request ? (
                        <p className="mt-1 text-xs text-danger">{inspection.correction_request}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-panel-muted px-3 py-5 text-center text-sm text-foreground/50">
              Henüz fotoğraf yok.
            </p>
          )}
        </Card>

        {role === "admin" ? (
          <Card title="Aksiyonlar">
            <div className="flex flex-wrap gap-2">
              {statusActions.map(([status, label]) => (
                <form action={updateServiceStatusAction} key={status}>
                  <input name="id" type="hidden" value={service.id} />
                  <input name="status" type="hidden" value={status} />
                  <SubmitButton
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-panel px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent/40 hover:bg-accent-surface hover:text-accent disabled:opacity-60"
                    label={label}
                    pendingLabel="Güncelleniyor..."
                  />
                </form>
              ))}
            </div>
            <form action={deleteServiceAction} className="mt-3 border-t border-border pt-3">
              <input name="id" type="hidden" value={service.id} />
              <SubmitButton
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/15 disabled:opacity-60"
                label="Servisi Sil"
                pendingLabel="Siliniyor..."
              />
            </form>
          </Card>
        ) : null}

        {role === "admin" ? (
          <Card title="Finans İşlemleri">
            <div className="space-y-5">
              <form action={initializeServiceFinanceAction} className="grid gap-3 md:grid-cols-2">
                <input name="service_id" type="hidden" value={service.id} />
                <Field label="Standart Fiyat" name="standard_price_snapshot" type="number" value={service.standard_price_snapshot?.toString()} />
                <Field label="Bölgesel Çarpan" name="regional_multiplier_snapshot" type="number" value={service.regional_multiplier_snapshot?.toString() ?? "1"} />
                <Field label="Pazarlık Maliyeti" name="negotiated_cost" type="number" value={service.negotiated_cost?.toString()} />
                <Field label="Onaylı Maliyet" name="approved_cost" type="number" value={service.approved_cost?.toString()} />
                <div className="md:col-span-2">
                  <SubmitButton className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" label="Finans Temelini Kaydet" pendingLabel="Kaydediliyor..." />
                </div>
              </form>

              <form action={createServiceNegotiationAction} className="grid gap-3 border-t border-border pt-4 md:grid-cols-2">
                <input name="service_id" type="hidden" value={service.id} />
                <Field label="Teklif Tutarı" name="offered_cost" required type="number" />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground/75">Sonuç</span>
                  <select
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                    defaultValue="proposed"
                    name="status"
                  >
                    <option value="proposed">Teklif</option>
                    <option value="accepted">Kabul</option>
                    <option value="rejected">Red</option>
                    <option value="canceled">İptal</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-foreground/75">İç Not</span>
                  <textarea className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" name="internal_note" />
                </label>
                <div className="md:col-span-2">
                  <SubmitButton className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground" label="Pazarlık Kaydı Ekle" pendingLabel="Ekleniyor..." />
                </div>
              </form>

              <form action={createServiceInvoiceAction} className="grid gap-3 border-t border-border pt-4 md:grid-cols-2">
                <input name="service_id" type="hidden" value={service.id} />
                <Field label="Fatura No" name="invoice_number" />
                <Field label="Fatura Tarihi" name="invoice_date" type="date" />
                <Field label="Fatura Tutarı" name="invoice_amount" required type="number" />
                <div className="md:col-span-2">
                  <InvoiceUploadField serviceId={service.id} />
                </div>
                <div className="md:col-span-2">
                  <SubmitButton className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground" label="Fatura Kaydet" pendingLabel="Kaydediliyor..." />
                </div>
              </form>
            </div>
          </Card>
        ) : null}

        {role === "admin" ? (
          <Card title="Vision Denetçi">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-foreground/65">
                  Saha fotoğraflarını AI ile kalite kontrolünden geçir ve düzeltme taleplerini üret.
                </p>
                <p className="mt-1 text-xs text-foreground/50">
                  Bekleyen: {photoInspections.filter((item) => item.status === "pending").length} ·
                  Hatalı: {photoInspections.filter((item) => item.status === "failed").length}
                </p>
              </div>
              <form action={processPendingPhotoInspectionsAction}>
                <input name="limit" type="hidden" value="5" />
                <SubmitButton
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground"
                  label="Foto Kuyruğunu İşle"
                  pendingLabel="İşleniyor..."
                />
              </form>
            </div>
          </Card>
        ) : null}

        <Card title="AI Ses Notları">
          <form action={createServiceVoiceNoteAction} className="space-y-3">
            <input name="service_id" type="hidden" value={service.id} />
            <VoiceNoteUploadField serviceId={service.id} />
            <SubmitButton
              className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground"
              label="Ses Notunu Kaydet"
              pendingLabel="Kaydediliyor..."
            />
          </form>
          {voiceNotes.length > 0 ? (
            <div className="mt-4 space-y-2">
              {voiceNotes.map((note) => (
                <div className="rounded-lg border border-border bg-panel-muted px-3 py-3 text-sm" key={note.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{aiRiskLabels[note.risk_level]}</span>
                    <span className="text-foreground/60">{aiJobStatusLabels[note.processing_status]}</span>
                  </div>
                  {note.summary ? <p className="mt-2 text-foreground/75">{note.summary}</p> : null}
                  {note.transcript ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-foreground/60">Transkript</summary>
                      <p className="mt-2 whitespace-pre-wrap text-xs text-foreground/70">{note.transcript}</p>
                    </details>
                  ) : null}
                  {note.processing_error ? (
                    <p className="mt-2 text-xs text-danger">{note.processing_error}</p>
                  ) : null}
                  {role === "admin" && note.processing_status !== "completed" ? (
                    <form action={analyzeServiceVoiceNoteAction} className="mt-3">
                      <input name="voice_note_id" type="hidden" value={note.id} />
                      <input name="service_id" type="hidden" value={service.id} />
                      <input name="storage_path" type="hidden" value={note.storage_path} />
                      <SubmitButton
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-3 py-2 text-xs font-semibold text-foreground"
                        label="AI Analizini Çalıştır"
                        pendingLabel="Çalışıyor..."
                      />
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        {negotiations.length > 0 ? (
          <Card title="Pazarlık Geçmişi">
            <div className="space-y-2">
              {negotiations.map((negotiation) => (
                <div className="rounded-lg border border-border bg-panel-muted px-3 py-2 text-sm" key={negotiation.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{formatCurrency(negotiation.offered_cost, service.currency)}</span>
                    <span className="text-foreground/60">{negotiationStatusLabels[negotiation.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">{formatDateTime(negotiation.created_at)}</p>
                  {negotiation.internal_note ? <p className="mt-1 text-sm text-foreground/70">{negotiation.internal_note}</p> : null}
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {invoices.length > 0 ? (
          <Card title="Fatura Geçmişi">
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div className="rounded-lg border border-border bg-panel-muted px-3 py-2 text-sm" key={invoice.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">
                      {invoice.invoice_number || "Fatura"} · {formatCurrency(invoice.invoice_amount, invoice.currency)}
                    </span>
                    <span className="text-foreground/60">{invoiceMatchLabels[invoice.match_status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">
                    {invoice.invoice_date ?? "-"} · {invoice.match_reason ?? "-"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {role === "admin" ? (
                      <>
                        <a
                          className="text-xs font-medium text-accent hover:underline"
                          href={`/api/invoices/${invoice.id}/download`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Dosyayı Aç
                        </a>
                        <span className="break-all text-xs text-foreground/45">{invoice.storage_path}</span>
                      </>
                    ) : null}
                  </div>
                  {role === "admin" ? (
                    <form action={deleteServiceInvoiceAction} className="mt-2">
                      <input name="invoice_id" type="hidden" value={invoice.id} />
                      <input name="service_id" type="hidden" value={service.id} />
                      <input name="storage_path" type="hidden" value={invoice.storage_path} />
                      <SubmitButton
                        className="inline-flex items-center justify-center rounded-lg border border-danger/30 bg-danger/8 px-3 py-2 text-xs font-medium text-danger"
                        label="Faturayı Sil"
                        pendingLabel="Siliniyor..."
                      />
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </section>

      {role === "admin" ? (
        <section>
          <div className="rounded-xl bg-panel p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
            <h3 className="mb-5 text-lg font-semibold">Servisi Düzenle</h3>
            <ServiceForm
              action={updateServiceAction}
              catalogItems={catalogItems}
              members={members}
              mode="edit"
              products={products}
              regions={regions}
              role="admin"
              service={service}
              serviceTypes={serviceTypes}
              subcontractors={subcontractors}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-xl bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      {title ? <h3 className="mb-3 font-semibold text-foreground">{title}</h3> : null}
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <dt className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</dt>
      <dd className="flex-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  value?: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/75">{label}</span>
      <input
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
        defaultValue={value ?? ""}
        name={name}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        type={type}
      />
    </label>
  );
}
