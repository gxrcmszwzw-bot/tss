import type { ServicePriority, ServiceStatus } from "@/lib/supabase/types";
import { priorityLabels, statusLabels } from "@/lib/labels";

const statusClass: Record<ServiceStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-800",
  awaiting_approval: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  canceled: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
};

const priorityClass: Record<ServicePriority, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-600",
  low: "bg-gray-50 text-gray-500",
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: ServicePriority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityClass[priority]}`}>
      {priorityLabels[priority]}
    </span>
  );
}
