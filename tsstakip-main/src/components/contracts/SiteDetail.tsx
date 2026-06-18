import type {
  Contract,
  ContractSite,
  CustomerSite,
  InstallationTask,
  Project,
  Service,
} from "@/lib/data";
import { contractLifecycleLabels, contractStatusLabels, statusLabels } from "@/lib/labels";
import type { ContractLifecycleStage } from "@/lib/contracts";

export function SiteDetail({
  contracts,
  contractStages,
  contractSites,
  installationTasks,
  projects,
  services,
  site,
}: {
  contracts: Contract[];
  contractStages: Map<string, ContractLifecycleStage>;
  contractSites: ContractSite[];
  installationTasks: InstallationTask[];
  projects: Project[];
  services: Service[];
  site: CustomerSite;
}) {
  const projectsByContractId = new Map<string, number>();
  for (const project of projects) {
    projectsByContractId.set(project.contract_id, (projectsByContractId.get(project.contract_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold">Site Ozeti</h2>
          <dl className="mt-4 divide-y divide-border text-sm">
            <Row label="Site Kodu" value={site.site_code} />
            <Row label="Site Adi" value={site.site_name ?? "—"} />
            <Row label="Musteri" value={site.customer_name} />
            <Row label="Telefon" value={site.customer_phone ?? "—"} />
            <Row label="Adres" value={site.address ?? "—"} />
            <Row label="Proje Adi" value={site.project_name ?? "—"} />
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold">Hizli Ozet</h2>
          <div className="mt-4 grid gap-3">
            <Stat label="Bagli Sozlesme" value={contracts.length} />
            <Stat label="Acik Servis" value={services.filter((item) => item.status !== "completed").length} />
            <Stat label="Acik Kurulum Isi" value={installationTasks.filter((item) => item.status !== "completed").length} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-panel p-4">
        <h2 className="text-lg font-semibold">Sozlesmeler</h2>
        {contracts.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/55">Bu siteye bagli sozlesme bulunmuyor.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {contracts.map((contract) => (
              <a
                className="block rounded-lg border border-border bg-background px-4 py-3 transition hover:border-accent/40"
                href={`/admin/contracts/${contract.id}`}
                key={contract.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{contract.contract_no}</p>
                  <span className="text-sm text-foreground/60">
                    {contractStatusLabels[contract.status] ?? contract.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground/70">{contract.contract_type}</p>
                <p className="mt-1 text-xs text-foreground/55">
                  {contractLifecycleLabels[contractStages.get(contract.id) ?? "draft"]} · {projectsByContractId.get(contract.id) ?? 0} proje
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold">Acik Servisler</h2>
          {services.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/55">Bu siteye bagli servis yok.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {services.map((service) => (
                <a
                  className="block rounded-lg border border-border bg-background px-4 py-3 transition hover:border-accent/40"
                  href={`/admin/services/${service.id}`}
                  key={service.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{service.service_number}</p>
                    <span className="text-sm text-foreground/60">{statusLabels[service.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">{service.address}</p>
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold">Kurulum Isleri</h2>
          {installationTasks.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/55">Bu siteye bagli kurulum isi yok.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {installationTasks.map((task) => (
                <div className="rounded-lg border border-border bg-background px-4 py-3" key={task.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{task.title}</p>
                    <span className="text-sm text-foreground/60">{task.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">{task.task_type}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-panel p-4">
        <h2 className="text-lg font-semibold">Site Iliskileri</h2>
        {contractSites.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/55">Henuz rol bazli baglanti tanimlanmamis.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {contractSites.map((contractSite) => (
              <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm" key={contractSite.id}>
                {contractSite.role} · {contractSite.is_primary ? "Ana site" : "Ek site"}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="text-foreground/60">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
