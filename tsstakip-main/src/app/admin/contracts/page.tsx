import Link from "next/link";

import { createContractAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { ContractCreateForm } from "@/components/contracts/ContractCreateForm";
import { requireAdmin } from "@/lib/auth";
import { contractLifecycleLabels, contractStatusLabels } from "@/lib/labels";

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await searchParams;

  const [contractsResult, customerSitesResult, membersResult] = await Promise.all([
    supabase.from("contracts").select("*").order("created_at", { ascending: false }),
    supabase.from("customer_sites").select("*").eq("is_active", true).order("site_code"),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
  ]);

  const customerSites = customerSitesResult.data ?? [];
  const siteById = new Map(customerSites.map((site) => [site.id, site]));
  const contracts = contractsResult.data ?? [];

  return (
    <>
      <PageHeader
        subtitle="Sozlesme merkezli operasyon omurgasi"
        title="Sozlesmeler"
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </div>
      ) : null}
      <ContractCreateForm
        action={createContractAction}
        customerSites={customerSites}
        members={membersResult.data ?? []}
      />
      <section className="mt-5 rounded-xl border border-border bg-panel p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Tum Sozlesmeler</h2>
          <span className="rounded-md bg-panel-muted px-2.5 py-1 text-xs font-semibold text-foreground/55">
            {contracts.length} kayit
          </span>
        </div>
        <div className="space-y-3">
          {contracts.length === 0 ? (
            <p className="text-sm text-foreground/55">Henuz sozlesme kaydi bulunmuyor.</p>
          ) : (
            contracts.map((contract) => {
              const site = contract.primary_site_id ? siteById.get(contract.primary_site_id) : null;
              return (
                <Link
                  className="block rounded-lg border border-border bg-background px-4 py-3 transition hover:border-accent/40"
                  href={`/admin/contracts/${contract.id}`}
                  key={contract.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{contract.contract_no}</p>
                      <p className="text-sm text-foreground/70">{contract.customer_name} · {contract.contract_type}</p>
                      <p className="mt-1 text-xs text-foreground/55">
                        {site ? `${site.site_code} · ${site.customer_name}` : "Ana site baglanmamis"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-foreground/60">
                      <p>{contractStatusLabels[contract.status] ?? contract.status}</p>
                      <p className="mt-1">{contractLifecycleLabels[(contract.lifecycle_stage as keyof typeof contractLifecycleLabels) ?? "draft"] ?? contract.lifecycle_stage}</p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
