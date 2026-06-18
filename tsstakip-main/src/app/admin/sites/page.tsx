import Link from "next/link";

import { PageHeader } from "@/components/layout/AppShell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminSitesPage() {
  const { supabase } = await requireAdmin();
  const [sitesResult, contractSitesResult, contractsResult, servicesResult, installationTasksResult] = await Promise.all([
    supabase.from("customer_sites").select("*").eq("is_active", true).order("site_code"),
    supabase.from("contract_sites").select("*"),
    supabase.from("contracts").select("id,contract_no,contract_type,primary_site_id"),
    supabase.from("services").select("id,customer_site_id,status"),
    supabase.from("installation_tasks").select("id,site_id,status"),
  ]);

  const contractCountsBySiteId = new Map<string, number>();
  const primaryContractBySiteId = new Map<string, string>();
  const serviceCountsBySiteId = new Map<string, number>();
  const installationCountsBySiteId = new Map<string, number>();

  for (const link of contractSitesResult.data ?? []) {
    contractCountsBySiteId.set(link.site_id, (contractCountsBySiteId.get(link.site_id) ?? 0) + 1);
  }

  for (const contract of contractsResult.data ?? []) {
    if (!contract.primary_site_id || primaryContractBySiteId.has(contract.primary_site_id)) continue;
    primaryContractBySiteId.set(contract.primary_site_id, `${contract.contract_no} · ${contract.contract_type}`);
  }

  for (const service of servicesResult.data ?? []) {
    if (!service.customer_site_id) continue;
    serviceCountsBySiteId.set(service.customer_site_id, (serviceCountsBySiteId.get(service.customer_site_id) ?? 0) + 1);
  }

  for (const task of installationTasksResult.data ?? []) {
    if (!task.site_id) continue;
    installationCountsBySiteId.set(task.site_id, (installationCountsBySiteId.get(task.site_id) ?? 0) + 1);
  }

  const sites = sitesResult.data ?? [];

  return (
    <>
      <PageHeader
        subtitle="Bir sitenin birden fazla sozlesmesini ve acik operasyonlarini izleyin"
        title="Siteler"
      />

      <section className="rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Tum Siteler</h2>
            <p className="text-sm text-foreground/55">{sites.length} aktif site</p>
          </div>
        </div>

        {sites.length === 0 ? (
          <p className="rounded-lg border border-border bg-background px-4 py-4 text-sm text-foreground/55">
            Henuz aktif site bulunmuyor.
          </p>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <Link
                className="block rounded-lg border border-border bg-background px-4 py-3 transition hover:border-accent/40"
                href={`/admin/sites/${site.id}`}
                key={site.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{site.site_code} · {site.customer_name}</p>
                    <p className="mt-1 text-sm text-foreground/60">{site.site_name ?? site.project_name ?? "Site karti"}</p>
                    <p className="mt-1 text-xs text-foreground/50">{primaryContractBySiteId.get(site.id) ?? "Ana sozlesme eslesmedi"}</p>
                  </div>
                  <div className="grid min-w-[220px] gap-2 text-right text-sm">
                    <span className="text-foreground/65">Sozlesme: {contractCountsBySiteId.get(site.id) ?? 0}</span>
                    <span className="text-foreground/65">Servis: {serviceCountsBySiteId.get(site.id) ?? 0}</span>
                    <span className="text-foreground/65">Kurulum Isi: {installationCountsBySiteId.get(site.id) ?? 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
