import { createProjectAction } from "@/app/actions";
import { InstallationBoard } from "@/components/contracts/InstallationBoard";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type {
  Contract,
  ContractProduct,
  ContractSite,
  CustomerSite,
  InstallationTask,
  Profile,
  Project,
  ProjectPhase,
  Service,
} from "@/lib/data";
import {
  contractLifecycleLabels,
  contractStatusLabels,
  formatDateTime,
  projectStatusLabels,
  statusLabels,
} from "@/lib/labels";
import type { ContractDetailSummary } from "@/lib/contracts";

export function ContractDetail({
  activeTab,
  contract,
  contractProducts,
  contractSites,
  customerSites,
  members,
  projects,
  phases,
  installationTasks,
  services,
  summary,
}: {
  activeTab: string;
  contract: Contract;
  contractProducts: ContractProduct[];
  contractSites: ContractSite[];
  customerSites: CustomerSite[];
  members: Profile[];
  projects: Project[];
  phases: ProjectPhase[];
  installationTasks: InstallationTask[];
  services: Service[];
  summary: ContractDetailSummary;
}) {
  const technicalOwner = members.find((member) => member.id === contract.technical_owner_id);
  const commercialOwner = members.find((member) => member.id === contract.commercial_owner_id);
  const primarySite = customerSites.find((site) => site.id === contract.primary_site_id);
  const siteById = new Map(customerSites.map((site) => [site.id, site]));
  const phasesByProjectId = new Map<string, ProjectPhase[]>();
  for (const phase of phases) {
    const list = phasesByProjectId.get(phase.project_id) ?? [];
    list.push(phase);
    phasesByProjectId.set(phase.project_id, list);
  }

  return (
    <div className="space-y-4">
      {activeTab === "general" ? (
        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-xl border border-border bg-panel p-4">
            <h2 className="text-lg font-semibold">Sozlesme Ozeti</h2>
            <dl className="mt-4 divide-y divide-border text-sm">
              <Row label="Sozlesme No" value={contract.contract_no} />
              <Row label="Tip" value={contract.contract_type} />
              <Row label="Musteri" value={contract.customer_name} />
              <Row label="Durum" value={contractStatusLabels[contract.status] ?? contract.status} />
              <Row label="Yasam Dongusu" value={contractLifecycleLabels[summary.lifecycleStage]} />
              <Row label="Ana Site" value={primarySite ? `${primarySite.site_code} · ${primarySite.customer_name}` : "—"} />
              <Row label="Teknik Sorumlu" value={technicalOwner?.full_name ?? "—"} />
              <Row label="Ticari Sorumlu" value={commercialOwner?.full_name ?? "—"} />
              <Row label="Baslangic" value={contract.start_date ?? "—"} />
              <Row label="Bitis" value={contract.end_date ?? "—"} />
              <Row label="Yenileme" value={contract.renewal_date ?? "—"} />
              <Row label="Notlar" value={contract.notes ?? "—"} />
            </dl>
          </div>
          <div className="rounded-xl border border-border bg-panel p-4">
            <h2 className="text-lg font-semibold">Hizli Ozet</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Stat label="Proje" value={summary.projectCount} />
              <Stat label="Bagli Site" value={summary.linkedSiteCount} />
              <Stat label="Urun" value={summary.contractProductCount} />
              <Stat label="Acik Kurulum Isi" value={summary.openInstallationTaskCount} />
              <Stat label="Acik Servis" value={summary.openServiceCount} />
              <Stat label="Tamamlanma" value={`%${summary.completionRate}`} />
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "products" ? (
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold">Urunler ve Malzemeler</h2>
          {contractProducts.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/55">Bu sozlesme icin henuz urun kaydi yok.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {contractProducts.map((product) => (
                <div className="rounded-lg border border-border bg-background px-4 py-3" key={product.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{product.product_name_snapshot}</p>
                    <span className="text-sm text-foreground/60">
                      {product.quantity} {product.unit ?? "adet"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/55">
                    {product.requires_installation ? "Kurulum gerekli" : "Kurulum gerekmiyor"} · {product.is_iot_related ? "IoT iliskili" : "IoT degil"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "installation" ? (
        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-panel p-4">
            <h2 className="text-lg font-semibold">Projeler</h2>
            {projects.length === 0 ? (
              <p className="mt-3 text-sm text-foreground/55">Henuz proje olusturulmamis.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {projects.map((project) => (
                  <div className="rounded-lg border border-border bg-background px-4 py-3" key={project.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{project.name}</p>
                      <span className="text-sm text-foreground/60">{projectStatusLabels[project.status] ?? project.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-foreground/55">
                      Plan: {formatDateTime(project.planned_start_at)} → {formatDateTime(project.planned_end_at)}
                    </p>
                    {(phasesByProjectId.get(project.id) ?? []).length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(phasesByProjectId.get(project.id) ?? []).map((phase) => (
                          <span className="rounded-full border border-border px-2.5 py-1 text-xs" key={phase.id}>
                            {phase.phase_key} · {phase.status}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-border bg-panel p-4">
            <h2 className="text-lg font-semibold">Kurulum Panosu</h2>
            <div className="mt-4">
              <InstallationBoard
                customerSites={customerSites}
                installationTasks={installationTasks}
                phases={phases}
              />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-panel p-4">
            <h2 className="text-lg font-semibold">Yeni Proje Ekle</h2>
            <form action={createProjectAction} className="mt-4 grid gap-3 md:grid-cols-2">
              <input name="contract_id" type="hidden" value={contract.id} />
              <Field label="Proje Adi" name="name" required />
              <Select label="Durum" name="status">
                <option value="planned">Planlandi</option>
                <option value="pending">Bekliyor</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="live">Canli</option>
                <option value="completed">Tamamlandi</option>
              </Select>
              <Field label="Planlanan Baslangic" name="planned_start_at" type="datetime-local" />
              <Field label="Planlanan Bitis" name="planned_end_at" type="datetime-local" />
              <Select label="Proje Yonetici" name="project_manager_id">
                <option value="">Seciniz</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                  </option>
                ))}
              </Select>
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-foreground/75">Not</span>
                <textarea className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent" name="notes" />
              </label>
              <div className="md:col-span-2">
                <SubmitButton label="Projeyi Kaydet" pendingLabel="Kaydediliyor..." />
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === "services" ? (
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold">Servis ve Destek</h2>
          {services.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/55">Bu sozlesmeye bagli servis kaydi bulunmuyor.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {services.map((service) => (
                <div className="rounded-lg border border-border bg-background px-4 py-3" key={service.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{service.service_number}</p>
                    <span className="text-sm text-foreground/60">{statusLabels[service.status]}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/70">{service.customer_name}</p>
                  <p className="mt-1 text-xs text-foreground/55">{service.address}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-3 py-2 text-xs font-semibold text-foreground hover:border-accent/40 hover:text-accent"
                      href={`/admin/services/${service.id}`}
                    >
                      Servisi Ac
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "iot" ? (
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold">IoT Operasyon</h2>
          <p className="mt-3 text-sm text-foreground/55">
            Bu modul sonraki fazda detaylanacak. Bu asamada sozlesmenin IoT ile iliskili urunleri ve site baglantilari bu karttan takip edilir.
          </p>
        </section>
      ) : null}

      {activeTab === "timeline" ? (
        <section className="rounded-xl border border-border bg-panel p-4">
          <h2 className="text-lg font-semibold">Zaman Cizgisi</h2>
          <div className="mt-4 space-y-3">
            <TimelineItem label="Sozlesme Olusturuldu" value={formatDateTime(contract.created_at)} />
            <TimelineItem label="Ana Site Iliskisi" value={primarySite ? `${primarySite.site_code} · ${primarySite.customer_name}` : "—"} />
            <TimelineItem label="Bagli Site Sayisi" value={String(contractSites.length)} />
            <TimelineItem label="Kurulum Isleri" value={`${summary.openInstallationTaskCount} acik / ${summary.completedInstallationTaskCount} tamamlandi`} />
            <TimelineItem label="Servisler" value={`${summary.openServiceCount} acik / ${summary.completedServiceCount} tamamlandi`} />
            <TimelineItem
              label="Bagli Siteler"
              value={
                contractSites.length > 0
                  ? contractSites.map((item) => siteById.get(item.site_id)?.site_code ?? item.site_id).join(", ")
                  : "—"
              }
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
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

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/75">{label}</span>
      <input
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function Select({
  children,
  label,
  name,
}: {
  children: React.ReactNode;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/75">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent"
        name={name}
      >
        {children}
      </select>
    </label>
  );
}
