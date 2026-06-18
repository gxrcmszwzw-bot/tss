import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/AppShell";
import { ContractDetail } from "@/components/contracts/ContractDetail";
import { ContractTabs } from "@/components/contracts/ContractTabs";
import { requireAdmin } from "@/lib/auth";
import { buildContractDetailSummary } from "@/lib/contracts";

function resolveTab(value?: string) {
  switch (value) {
    case "products":
    case "installation":
    case "services":
    case "iot":
    case "timeline":
      return value;
    default:
      return "general";
  }
}

export default async function AdminContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { id } = await params;
  const { tab, error } = await searchParams;
  const activeTab = resolveTab(tab);
  const { supabase } = await requireAdmin();

  const [
    contractResult,
    customerSitesResult,
    membersResult,
    contractSitesResult,
    contractProductsResult,
    projectsResult,
    phasesResult,
    installationTasksResult,
    servicesResult,
  ] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", id).maybeSingle(),
    supabase.from("customer_sites").select("*").order("site_code"),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("contract_sites").select("*").eq("contract_id", id).order("created_at"),
    supabase.from("contract_products").select("*").eq("contract_id", id).order("created_at"),
    supabase.from("projects").select("*").eq("contract_id", id).order("created_at"),
    supabase.from("project_phases").select("*").order("sort_order"),
    supabase.from("installation_tasks").select("*").eq("contract_id", id).order("created_at"),
    supabase.from("services").select("*").eq("contract_id", id).order("created_at", { ascending: false }),
  ]);

  const contract = contractResult.data;
  if (!contract) notFound();

  const projectIds = new Set((projectsResult.data ?? []).map((project) => project.id));
  const phases = (phasesResult.data ?? []).filter((phase) => projectIds.has(phase.project_id));
  const summary = buildContractDetailSummary({
    contract,
    projects: projectsResult.data ?? [],
    phases,
    contractSites: contractSitesResult.data ?? [],
    contractProducts: contractProductsResult.data ?? [],
    installationTasks: installationTasksResult.data ?? [],
    services: servicesResult.data ?? [],
  });

  return (
    <>
      <PageHeader
        subtitle={`${contract.customer_name} · ${contract.contract_type}`}
        title={contract.contract_no}
      />
      {error ? (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </div>
      ) : null}
      <ContractTabs activeTab={activeTab} contractId={contract.id} />
      <ContractDetail
        activeTab={activeTab}
        contract={contract}
        contractProducts={contractProductsResult.data ?? []}
        contractSites={contractSitesResult.data ?? []}
        customerSites={customerSitesResult.data ?? []}
        members={membersResult.data ?? []}
        phases={phases}
        projects={projectsResult.data ?? []}
        services={servicesResult.data ?? []}
        summary={summary}
      />
    </>
  );
}
