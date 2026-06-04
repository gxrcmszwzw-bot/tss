import { PageHeader } from "@/components/layout/AppShell";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { finalizePayoutBatchAction, markPayoutBatchPaidAction, overridePayoutBatchItemAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import {
  financeStatusLabels,
  formatCurrency,
  formatDateTime,
  payoutBatchLabels,
  payoutItemLabels,
  payoutReasonLabels,
} from "@/lib/labels";
import type { Json } from "@/lib/supabase/types";

type SearchParams = Promise<{
  batch?: string;
  error?: string;
  ok?: string;
}>;

const FINANCE_AUDIT_ENTITIES = [
  "payout_batches",
  "payout_batch_items",
  "service_invoices",
  "service_negotiations",
  "services",
] as const;

export default async function FinanceAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  const params = await searchParams;

  if (!activeOrganizationId) {
    return (
      <>
        <PageHeader
          subtitle="Aktif organizasyon bulunamadı"
          title="Finans Denetim Merkezi"
        />
        <div className="rounded-xl bg-panel p-8 text-center text-sm text-foreground/55" style={{ boxShadow: "var(--shadow-sm)" }}>
          Finans kayıtlarını görüntülemek için aktif bir organizasyon üyeliği gerekli.
        </div>
      </>
    );
  }

  const [
    payoutBatchesResult,
    payoutBatchItemsResult,
    servicesResult,
    invoicesResult,
    profilesResult,
    auditLogsResult,
  ] = await Promise.all([
    supabase
      .from("payout_batches")
      .select("*")
      .order("batch_date", { ascending: false })
      .limit(18),
    supabase
      .from("payout_batch_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250),
    supabase
      .from("services")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_invoices")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .order("uploaded_at", { ascending: false }),
    supabase.from("profiles").select("id,full_name").order("full_name"),
    supabase
      .from("audit_logs")
      .select("*")
      .in("entity_type", [...FINANCE_AUDIT_ENTITIES])
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const payoutBatches = payoutBatchesResult.data ?? [];
  const payoutBatchItems = payoutBatchItemsResult.data ?? [];
  const services = servicesResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const auditLogs = auditLogsResult.data ?? [];
  const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

  const selectedBatch =
    payoutBatches.find((batch) => batch.id === params.batch) ??
    payoutBatches.find((batch) => batch.status === "draft") ??
    payoutBatches[0] ??
    null;

  const selectedBatchItems = selectedBatch
    ? payoutBatchItems.filter((item) => item.batch_id === selectedBatch.id)
    : [];
  const selectedServiceIds = new Set(selectedBatchItems.map((item) => item.service_id));
  const selectedInvoiceIds = new Set(
    selectedBatchItems.map((item) => item.invoice_id).filter(Boolean),
  );

  const financeLogs = selectedBatch
    ? auditLogs.filter((log) => {
        if (log.entity_type === "payout_batches") return log.entity_id === selectedBatch.id;
        if (log.entity_type === "payout_batch_items") {
          return readString(log.new_data, "batch_id") === selectedBatch.id || readString(log.old_data, "batch_id") === selectedBatch.id;
        }
        if (log.entity_type === "service_invoices") {
          return (
            selectedInvoiceIds.has(log.entity_id ?? "") ||
            selectedServiceIds.has(readString(log.new_data, "service_id")) ||
            selectedServiceIds.has(readString(log.old_data, "service_id"))
          );
        }
        if (log.entity_type === "service_negotiations" || log.entity_type === "services") {
          return (
            selectedServiceIds.has(log.entity_id ?? "") ||
            selectedServiceIds.has(readString(log.new_data, "service_id")) ||
            selectedServiceIds.has(readString(log.old_data, "service_id"))
          );
        }

        return false;
      })
    : auditLogs;

  const draftCount = payoutBatches.filter((batch) => batch.status === "draft").length;
  const finalizedCount = payoutBatches.filter((batch) => batch.status === "finalized").length;
  const paidCount = payoutBatches.filter((batch) => batch.status === "paid").length;
  const overrideCount = payoutBatchItems.filter((item) => item.inclusion_status === "overridden").length;
  const invoiceReviewCount = services.filter((service) => service.finance_status === "invoice_under_review").length;
  const excludedCount = services.filter((service) => service.finance_status === "excluded_from_batch").length;

  return (
    <>
      <PageHeader
        subtitle={`Taslak: ${draftCount} · Kesinleşen: ${finalizedCount} · Ödenen: ${paidCount}`}
        title="Finans Denetim Merkezi"
      />

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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Taslak Batch" value={String(draftCount)} />
        <StatCard label="Kesinleşen" value={String(finalizedCount)} />
        <StatCard label="Ödenen" value={String(paidCount)} />
        <StatCard label="Override Satırı" value={String(overrideCount)} />
        <StatCard label="İncelemede Fatura" value={String(invoiceReviewCount)} />
        <StatCard label="Batch Dışı Servis" value={String(excludedCount)} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="mb-3">
            <h2 className="font-semibold">Batch Geçmişi</h2>
            <p className="text-sm text-foreground/55">Payout akışını batch bazında incele</p>
          </div>
          {payoutBatches.length === 0 ? (
            <p className="rounded-lg bg-panel-muted px-3 py-4 text-sm text-foreground/55">
              Henüz batch üretilmedi.
            </p>
          ) : (
            <div className="space-y-2">
              {payoutBatches.map((batch) => {
                const isActive = selectedBatch?.id === batch.id;
                return (
                  <a
                    className={`block rounded-lg border px-3 py-3 text-sm transition ${
                      isActive
                        ? "border-accent bg-accent/8"
                        : "border-border bg-background hover:border-accent/35"
                    }`}
                    href={`/admin/finance-audit?batch=${batch.id}`}
                    key={batch.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{batch.batch_date}</span>
                      <span className="text-xs text-foreground/60">{payoutBatchLabels[batch.status]}</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/55">
                      Cut-off: {formatDateTime(batch.cutoff_at)}
                    </p>
                    {batch.finalized_at ? (
                      <p className="mt-1 text-xs text-foreground/55">
                        Finalize: {formatDateTime(batch.finalized_at)}
                      </p>
                    ) : null}
                    {batch.paid_at ? (
                      <p className="mt-1 text-xs text-foreground/55">
                        Paid: {formatDateTime(batch.paid_at)}
                      </p>
                    ) : null}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-semibold">Seçili Batch</h2>
                {selectedBatch ? (
                  <p className="text-sm text-foreground/55">
                    {selectedBatch.batch_date} · {payoutBatchLabels[selectedBatch.status]}
                  </p>
                ) : (
                  <p className="text-sm text-foreground/55">Henüz seçili batch yok.</p>
                )}
              </div>
              {selectedBatch ? (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedBatch.status === "draft" ? (
                    <>
                      <form action={finalizePayoutBatchAction}>
                        <input name="batch_id" type="hidden" value={selectedBatch.id} />
                        <SubmitButton
                          className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
                          label="Batch'i Finalize Et"
                          pendingLabel="Finalizing..."
                        />
                      </form>
                      <form action={markPayoutBatchPaidAction}>
                        <input name="batch_id" type="hidden" value={selectedBatch.id} />
                        <SubmitButton
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                          label="Paid Olarak İşaretle"
                          pendingLabel="İşleniyor..."
                        />
                      </form>
                    </>
                  ) : null}
                  {selectedBatch.status === "finalized" ? (
                    <form action={markPayoutBatchPaidAction}>
                      <input name="batch_id" type="hidden" value={selectedBatch.id} />
                      <SubmitButton
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                        label="Paid Olarak İşaretle"
                        pendingLabel="İşleniyor..."
                      />
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>

            {selectedBatch ? (
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <MiniCard
                  label="Toplam Satır"
                  value={String(selectedBatchItems.length)}
                />
                <MiniCard
                  label="Dahil"
                  value={String(selectedBatchItems.filter((item) => item.inclusion_status === "included").length)}
                />
                <MiniCard
                  label="Override"
                  value={String(selectedBatchItems.filter((item) => item.inclusion_status === "overridden").length)}
                />
                <MiniCard
                  label="Toplam Tutar"
                  value={formatCurrency(
                    selectedBatchItems.reduce((sum, item) => {
                      const invoice = item.invoice_id ? invoicesById.get(item.invoice_id) : null;
                      return sum + (invoice?.invoice_amount ?? 0);
                    }, 0),
                    "TRY",
                  )}
                />
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {selectedBatchItems.length === 0 ? (
                <p className="rounded-lg bg-panel-muted px-3 py-4 text-sm text-foreground/55">
                  Bu batch için satır bulunamadı.
                </p>
              ) : (
                selectedBatchItems.map((item) => {
                  const service = servicesById.get(item.service_id);
                  const invoice = item.invoice_id ? invoicesById.get(item.invoice_id) : null;

                  return (
                    <div className="rounded-lg border border-border bg-background p-3" key={item.id}>
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {service?.customer_name ?? item.service_id}
                            </p>
                            <span className="rounded-md bg-panel-muted px-2 py-0.5 text-xs text-foreground/60">
                              {payoutItemLabels[item.inclusion_status]}
                            </span>
                            {service ? (
                              <span className="rounded-md bg-panel-muted px-2 py-0.5 text-xs text-foreground/60">
                                {financeStatusLabels[service.finance_status]}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-foreground/55">
                            {service ? (
                              <a className="font-medium text-accent hover:underline" href={`/admin/services/${service.id}`}>
                                {service.service_number}
                              </a>
                            ) : null}
                            <span>{payoutReasonLabels[item.reason_code ?? ""] ?? item.reason_code ?? "-"}</span>
                            {invoice ? (
                              <span>
                                {invoice.invoice_number ?? "Fatura"} · {formatCurrency(invoice.invoice_amount, invoice.currency)}
                              </span>
                            ) : (
                              <span>Fatura bağlı değil</span>
                            )}
                          </div>
                          {item.override_note ? (
                            <p className="mt-2 rounded-md bg-panel-muted px-3 py-2 text-sm text-foreground/70">
                              <strong>Override notu:</strong> {item.override_note}
                            </p>
                          ) : null}
                        </div>

                        <form action={overridePayoutBatchItemAction} className="grid gap-2 lg:min-w-[340px]">
                          <input name="batch_id" type="hidden" value={selectedBatch.id} />
                          <input name="item_id" type="hidden" value={item.id} />
                          <input name="service_id" type="hidden" value={item.service_id} />
                          <select
                            className="h-10 rounded-lg border border-border bg-panel px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                            defaultValue={item.inclusion_status === "included" ? "included" : "excluded"}
                            name="inclusion_status"
                          >
                            <option value="included">Dahil et</option>
                            <option value="excluded">Hariç bırak</option>
                          </select>
                          <input
                            className="h-10 rounded-lg border border-border bg-panel px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                            name="override_note"
                            placeholder="Override gerekçesi"
                            required
                          />
                          <SubmitButton
                            className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent"
                            label="Override Kaydet"
                            pendingLabel="Kaydediliyor..."
                          />
                        </form>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="mb-3">
              <h2 className="font-semibold">Finans Audit Akışı</h2>
              <p className="text-sm text-foreground/55">Batch ile ilişkili son değişiklik geçmişi</p>
            </div>

            {financeLogs.length === 0 ? (
              <p className="rounded-lg bg-panel-muted px-3 py-4 text-sm text-foreground/55">
                Bu kapsam için audit kaydı bulunamadı.
              </p>
            ) : (
              <div className="space-y-2">
                {financeLogs.map((log) => (
                  <div className="rounded-lg border border-border bg-background px-3 py-3" key={log.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-panel-muted px-2 py-0.5 text-xs text-foreground/60">
                          {log.entity_type}
                        </span>
                        <span className="text-sm font-medium uppercase tracking-wide text-foreground/75">
                          {log.action}
                        </span>
                      </div>
                      <span className="text-xs text-foreground/55">{formatDateTime(log.created_at)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/55">
                      <span>Aktör: {profilesById.get(log.actor_user_id ?? "") ?? "Sistem"}</span>
                      {describeAuditTarget(log, servicesById, invoicesById) ? (
                        <span>{describeAuditTarget(log, servicesById, invoicesById)}</span>
                      ) : null}
                    </div>
                    {readString(log.new_data, "finance_status") || readString(log.old_data, "finance_status") ? (
                      <p className="mt-2 text-sm text-foreground/70">
                        Finans durumu:{" "}
                        {financeStatusLabels[
                          (readString(log.old_data, "finance_status") ??
                            readString(log.new_data, "finance_status")) as keyof typeof financeStatusLabels
                        ] ?? "-"}
                        {readString(log.old_data, "finance_status") && readString(log.new_data, "finance_status")
                          ? ` -> ${financeStatusLabels[readString(log.new_data, "finance_status") as keyof typeof financeStatusLabels] ?? "-"}`
                          : ""}
                      </p>
                    ) : null}
                    {readString(log.new_data, "override_note") || readString(log.old_data, "override_note") ? (
                      <p className="mt-2 rounded-md bg-panel-muted px-3 py-2 text-sm text-foreground/70">
                        <strong>Not:</strong>{" "}
                        {readString(log.new_data, "override_note") ?? readString(log.old_data, "override_note")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function readString(value: Json | null, key: string) {
  if (!value || Array.isArray(value) || typeof value !== "object") return "";
  const field = value[key];
  return typeof field === "string" ? field : "";
}

function describeAuditTarget(
  log: {
    entity_type: string;
    entity_id: string | null;
    new_data: Json | null;
    old_data: Json | null;
  },
  servicesById: Map<string, { customer_name: string; service_number: string }>,
  invoicesById: Map<string, { invoice_number: string | null }>,
) {
  if (log.entity_type === "services") {
    const service = servicesById.get(log.entity_id ?? "");
    return service ? `Servis: ${service.service_number} · ${service.customer_name}` : null;
  }

  const serviceId = readString(log.new_data, "service_id") || readString(log.old_data, "service_id");
  const invoiceId = log.entity_type === "service_invoices" ? log.entity_id ?? "" : "";
  const service = servicesById.get(serviceId);
  const invoice = invoicesById.get(invoiceId);

  if (service && invoice) {
    return `Servis: ${service.service_number} · Fatura: ${invoice.invoice_number ?? invoiceId}`;
  }
  if (service) {
    return `Servis: ${service.service_number} · ${service.customer_name}`;
  }
  if (invoice) {
    return `Fatura: ${invoice.invoice_number ?? invoiceId}`;
  }

  return log.entity_id ? `Kayıt: ${log.entity_id}` : null;
}
