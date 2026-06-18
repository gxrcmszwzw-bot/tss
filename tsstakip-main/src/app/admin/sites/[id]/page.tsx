import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/AppShell";
import { SiteDetail } from "@/components/contracts/SiteDetail";
import { requireAdmin } from "@/lib/auth";
import { summarizeContractLifecycle, type ContractLifecycleStage } from "@/lib/contracts";

export default async function AdminSiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [siteResult, contractSitesResult, servicesResult, installationTasksResult] = await Promise.all([
    supabase.from("customer_sites").select("*").eq("id", id).maybeSingle(),
    supabase.from("contract_sites").select("*").eq("site_id", id).order("created_at"),
    supabase.from("services").select("*").eq("customer_site_id", id).order("created_at", { ascending: false }),
    supabase.from("installation_tasks").select("*").eq("site_id", id).order("created_at", { ascending: false }),
  ]);

  const site = siteResult.data;
  if (!site) notFound();

  const contractIds = [...new Set((contractSitesResult.data ?? []).map((item) => item.contract_id))];
  const [contractsResult, projectsResult, allTasksResult, contractServicesResult] = contractIds.length
    ? await Promise.all([
        supabase.from("contracts").select("*").in("id", contractIds).order("created_at", { ascending: false }),
        supabase.from("projects").select("*").in("contract_id", contractIds).order("created_at", { ascending: false }),
        supabase.from("installation_tasks").select("*").in("contract_id", contractIds),
        supabase.from("services").select("*").in("contract_id", contractIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  const contractStages = new Map<string, ContractLifecycleStage>();
  for (const contract of contractsResult.data ?? []) {
    const lifecycle = summarizeContractLifecycle({
      contract,
      projects: (projectsResult.data ?? []).filter((project) => project.contract_id === contract.id),
      installationTasks: (allTasksResult.data ?? []).filter((task) => task.contract_id === contract.id),
      services: (contractServicesResult.data ?? []).filter((service) => service.contract_id === contract.id),
    });
    contractStages.set(contract.id, lifecycle.lifecycleStage);
  }

  return (
    <>
      <PageHeader subtitle={site.customer_name} title={site.site_code} />
      <SiteDetail
        contracts={contractsResult.data ?? []}
        contractSites={contractSitesResult.data ?? []}
        contractStages={contractStages}
        installationTasks={installationTasksResult.data ?? []}
        projects={projectsResult.data ?? []}
        services={servicesResult.data ?? []}
        site={site}
      />
    </>
  );
}
