import {
  createServiceAction,
  finalizePayoutBatchAction,
  generatePayoutBatchAction,
  markPayoutBatchPaidAction,
  overridePayoutBatchItemAction,
} from "@/app/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { ServiceCard } from "@/components/services/ServiceCard";
import { ServiceCreateModal } from "@/components/services/ServiceCreateModal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { buildNextCutoffDefaults } from "@/lib/finance";
import {
  formatCurrency,
  payoutBatchLabels,
  payoutItemLabels,
  payoutReasonLabels,
} from "@/lib/labels";
import { createLookup } from "@/lib/data";

export default async function AdminServicesPage() {
  const defaults = buildNextCutoffDefaults();
  const { supabase } = await requireAdmin();
  const [servicesResult, productsResult, typesResult, membersResult, subcontractorsResult, payoutBatchesResult, regionsResult, catalogItemsResult, customerSitesResult] =
    await Promise.all([
      supabase.from("services").select("*").order("created_at", { ascending: false }),
      supabase.from("product_groups").select("*").order("name"),
      supabase.from("service_types").select("*").order("name"),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("subcontractors").select("*").order("name"),
      supabase.from("payout_batches").select("*").order("batch_date", { ascending: false }).limit(5),
      supabase.from("regions").select("*").order("name"),
      supabase.from("catalog_items").select("*").order("name"),
      supabase.from("customer_sites").select("*").eq("is_active", true).order("site_code"),
    ]);
  const lookup = createLookup({
    products: productsResult.data,
    types: typesResult.data,
    members: membersResult.data,
    subcontractors: subcontractorsResult.data,
  });
  const services = servicesResult.data ?? [];
  const payoutBatches = payoutBatchesResult.data ?? [];
  const activeDraftBatch = payoutBatches.find((batch) => batch.status === "draft") ?? payoutBatches[0] ?? null;
  const [draftItemsResult, invoicesResult] = activeDraftBatch
    ? await Promise.all([
        supabase
          .from("payout_batch_items")
          .select("*")
          .eq("batch_id", activeDraftBatch.id)
          .order("created_at", { ascending: false }),
        supabase.from("service_invoices").select("*"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  const draftItems = draftItemsResult.data ?? [];
  const invoicesById = new Map((invoicesResult.data ?? []).map((invoice) => [invoice.id, invoice]));
  const servicesById = new Map(services.map((service) => [service.id, service]));

  return (
    <>
      <PageHeader
        actions={
          <>
            <a
              className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
              href="/admin/finance-audit"
            >
              Finans Denetim
            </a>
            <ServiceCreateModal
              action={createServiceAction}
              buttonLabel="Yeni Servis"
              catalogItems={catalogItemsResult.data ?? []}
              customerSites={customerSitesResult.data ?? []}
              members={membersResult.data ?? []}
              products={productsResult.data ?? []}
              regions={regionsResult.data ?? []}
              role="admin"
              serviceTypes={typesResult.data ?? []}
              subcontractors={subcontractorsResult.data ?? []}
              title="Yeni Servis"
            />
          </>
        }
        subtitle={`${services.length} servis kaydı`}
        title="Servisler"
      />
      <div className="mb-4 rounded-xl bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Haftalık Payout Batch</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Çarşamba 12:00 cut-off baz alınarak ödeme listesi üret.
            </p>
          </div>
          <div className="grid gap-3 lg:min-w-[420px]">
            <form action={generatePayoutBatchAction} className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground/75">Ödeme Tarihi</span>
                <input
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  defaultValue={defaults.batchDate.toISOString().slice(0, 10)}
                  name="batch_date"
                  type="date"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground/75">Cut-off</span>
                <input
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  defaultValue={defaults.cutoff.toISOString().slice(0, 16)}
                  name="cutoff_at"
                  type="datetime-local"
                />
              </label>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <SubmitButton className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white" label="Payout Batch Üret" pendingLabel="Üretiliyor..." />
                <a
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
                  href="/admin/finance-audit"
                >
                  Ayrıntılı Denetime Git
                </a>
              </div>
            </form>
          </div>
        </div>
        {payoutBatches.length > 0 ? (
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {payoutBatches.map((batch) => (
              <div className="rounded-lg border border-border bg-panel-muted px-3 py-2 text-sm" key={batch.id}>
                <p className="font-medium">{batch.batch_date}</p>
                <p className="text-foreground/60">{payoutBatchLabels[batch.status]}</p>
              </div>
            ))}
          </div>
        ) : null}
        {activeDraftBatch ? (
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">Aktif Batch İncelemesi</h3>
                <p className="text-sm text-foreground/60">
                  {activeDraftBatch.batch_date} · {payoutBatchLabels[activeDraftBatch.status]}
                </p>
              </div>
              {activeDraftBatch.status === "draft" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={finalizePayoutBatchAction}>
                    <input name="batch_id" type="hidden" value={activeDraftBatch.id} />
                    <SubmitButton
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
                      label="Batch'i Finalize Et"
                      pendingLabel="Finalizing..."
                    />
                  </form>
                  <form action={markPayoutBatchPaidAction}>
                    <input name="batch_id" type="hidden" value={activeDraftBatch.id} />
                    <SubmitButton
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                      label="Paid Olarak İşaretle"
                      pendingLabel="İşleniyor..."
                    />
                  </form>
                </div>
              ) : activeDraftBatch.status === "finalized" ? (
                <form action={markPayoutBatchPaidAction}>
                  <input name="batch_id" type="hidden" value={activeDraftBatch.id} />
                  <SubmitButton
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    label="Paid Olarak İşaretle"
                    pendingLabel="İşleniyor..."
                  />
                </form>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              {draftItems.length === 0 ? (
                <p className="rounded-lg bg-panel-muted px-3 py-4 text-sm text-foreground/55">
                  Bu batch için henüz satır üretilmedi.
                </p>
              ) : (
                draftItems.map((item) => {
                  const service = servicesById.get(item.service_id);
                  const invoice = item.invoice_id ? invoicesById.get(item.invoice_id) : null;

                  return (
                    <div className="rounded-lg border border-border bg-panel-muted p-3" key={item.id}>
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="font-medium">
                            {service?.customer_name ?? item.service_id} · {payoutItemLabels[item.inclusion_status]}
                          </p>
                          <p className="text-sm text-foreground/60">
                            {payoutReasonLabels[item.reason_code ?? ""] ?? item.reason_code ?? "-"}
                          </p>
                          <p className="mt-1 text-xs text-foreground/55">
                            {invoice
                              ? `${invoice.invoice_number ?? "Fatura"} · ${formatCurrency(invoice.invoice_amount, invoice.currency)}`
                              : "Fatura bagli degil"}
                          </p>
                        </div>
                        <form action={overridePayoutBatchItemAction} className="grid gap-2 lg:min-w-[340px]">
                          <input name="batch_id" type="hidden" value={activeDraftBatch.id} />
                          <input name="item_id" type="hidden" value={item.id} />
                          <input name="service_id" type="hidden" value={item.service_id} />
                          <select
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                            defaultValue={item.inclusion_status === "included" ? "included" : "excluded"}
                            name="inclusion_status"
                          >
                            <option value="included">Dahil et</option>
                            <option value="excluded">Hariç bırak</option>
                          </select>
                          <input
                            className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
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
          </div>
        ) : null}
      </div>
      <div className="space-y-2.5">
        {services.length === 0 ? (
          <p className="rounded-xl bg-panel p-8 text-center text-sm text-foreground/50" style={{ boxShadow: "var(--shadow-sm)" }}>
            Henüz servis kaydı yok.
          </p>
        ) : (
          services.map((service) => (
            <ServiceCard href={`/admin/services/${service.id}`} key={service.id} lookup={lookup} service={service} />
          ))
        )}
      </div>
    </>
  );
}
