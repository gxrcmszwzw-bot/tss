import type { CustomerSite, InstallationTask, ProjectPhase } from "@/lib/data";

type InstallationBoardProps = {
  installationTasks: InstallationTask[];
  phases: ProjectPhase[];
  customerSites: CustomerSite[];
};

export function InstallationBoard({
  installationTasks,
  phases,
  customerSites,
}: InstallationBoardProps) {
  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const siteById = new Map(customerSites.map((site) => [site.id, site]));
  const openTasks = installationTasks.filter((task) => task.status !== "completed");
  const completedTasks = installationTasks.filter((task) => task.status === "completed");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Toplam Is" value={installationTasks.length} />
        <Stat label="Acik Is" value={openTasks.length} />
        <Stat label="Tamamlanan" value={completedTasks.length} />
      </div>
      {installationTasks.length === 0 ? (
        <p className="rounded-lg border border-border bg-background px-4 py-4 text-sm text-foreground/55">
          Bu sozlesme icin henuz kurulum isi tanimlanmadi.
        </p>
      ) : (
        <div className="space-y-3">
          {installationTasks.map((task) => {
            const phase = phaseById.get(task.project_phase_id);
            const site = task.site_id ? siteById.get(task.site_id) : null;

            return (
              <div className="rounded-lg border border-border bg-background px-4 py-3" key={task.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">{task.title}</p>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                    {task.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground/55">
                  {phase?.phase_key ?? "Fazsiz"} · {task.task_type}
                </p>
                <p className="mt-1 text-sm text-foreground/70">
                  {site ? `${site.site_code} · ${site.customer_name}` : "Site baglantisi yok"}
                </p>
              </div>
            );
          })}
        </div>
      )}
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
