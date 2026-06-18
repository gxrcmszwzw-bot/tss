import type {
  Contract,
  ContractProduct,
  ContractSite,
  InstallationTask,
  Project,
  ProjectPhase,
  Service,
} from "@/lib/data";

export type ContractLifecycleStage =
  | "draft"
  | "approved"
  | "procurement_pending"
  | "installation_planned"
  | "installation_in_progress"
  | "partially_live"
  | "live"
  | "support_phase"
  | "renewal_due"
  | "closed";

export type ContractLifecycleSummary = {
  lifecycleStage: ContractLifecycleStage;
};

export type ContractDetailSummary = {
  lifecycleStage: ContractLifecycleStage;
  projectCount: number;
  linkedSiteCount: number;
  contractProductCount: number;
  openInstallationTaskCount: number;
  completedInstallationTaskCount: number;
  openServiceCount: number;
  completedServiceCount: number;
  completionRate: number;
};

function isOpenTask(status: string) {
  return status === "pending" || status === "in_progress";
}

function isClosedTask(status: string) {
  return status === "completed";
}

function isOpenService(status: Service["status"]) {
  return !["completed", "canceled", "rejected"].includes(status);
}

function toLifecycleStage(value: string | null | undefined): ContractLifecycleStage {
  switch (value) {
    case "draft":
    case "approved":
    case "procurement_pending":
    case "installation_planned":
    case "installation_in_progress":
    case "partially_live":
    case "live":
    case "support_phase":
    case "renewal_due":
    case "closed":
      return value;
    default:
      return "draft";
  }
}

export function summarizeContractLifecycle(input: {
  contract: Pick<Contract, "status" | "lifecycle_stage" | "end_date">;
  projects: Array<Pick<Project, "status">>;
  installationTasks: Array<Pick<InstallationTask, "status">>;
  services: Array<Pick<Service, "status">>;
  now?: Date;
}): ContractLifecycleSummary {
  const now = input.now ?? new Date();
  const endDate = input.contract.end_date ? new Date(input.contract.end_date) : null;
  const hasOpenInstallTask = input.installationTasks.some((task) => isOpenTask(task.status));
  const hasCompletedInstallTask = input.installationTasks.some((task) => isClosedTask(task.status));
  const hasOpenService = input.services.some((service) => isOpenService(service.status));
  const hasLiveProject = input.projects.some((project) => project.status === "live");
  const hasPlannedProject = input.projects.some((project) =>
    ["planned", "pending", "in_progress"].includes(project.status),
  );

  if (endDate) {
    const renewalWindowStart = new Date(endDate);
    renewalWindowStart.setDate(renewalWindowStart.getDate() - 30);
    if (now >= renewalWindowStart && now <= endDate) {
      return { lifecycleStage: "renewal_due" };
    }
  }

  if (hasOpenInstallTask) {
    return { lifecycleStage: "installation_in_progress" };
  }

  if (hasPlannedProject) {
    return { lifecycleStage: "installation_planned" };
  }

  if (hasCompletedInstallTask && hasOpenService) {
    return { lifecycleStage: "support_phase" };
  }

  if (hasLiveProject) {
    return { lifecycleStage: "live" };
  }

  if (hasCompletedInstallTask) {
    return { lifecycleStage: "partially_live" };
  }

  return { lifecycleStage: toLifecycleStage(input.contract.lifecycle_stage) };
}

export function buildContractDetailSummary(input: {
  contract: Pick<Contract, "status" | "lifecycle_stage" | "end_date">;
  projects: Project[];
  phases: ProjectPhase[];
  contractSites: ContractSite[];
  contractProducts: ContractProduct[];
  installationTasks: InstallationTask[];
  services: Service[];
  now?: Date;
}): ContractDetailSummary {
  void input.phases;
  const lifecycle = summarizeContractLifecycle({
    contract: input.contract,
    projects: input.projects,
    installationTasks: input.installationTasks,
    services: input.services,
    now: input.now,
  });

  const openInstallationTaskCount = input.installationTasks.filter((task) => isOpenTask(task.status)).length;
  const completedInstallationTaskCount = input.installationTasks.filter((task) => isClosedTask(task.status)).length;
  const openServiceCount = input.services.filter((service) => isOpenService(service.status)).length;
  const completedServiceCount = input.services.filter((service) => service.status === "completed").length;
  const totalTasks = input.installationTasks.length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedInstallationTaskCount / totalTasks) * 100);

  return {
    lifecycleStage: lifecycle.lifecycleStage,
    projectCount: input.projects.length,
    linkedSiteCount: input.contractSites.length,
    contractProductCount: input.contractProducts.length,
    openInstallationTaskCount,
    completedInstallationTaskCount,
    openServiceCount,
    completedServiceCount,
    completionRate,
  };
}
