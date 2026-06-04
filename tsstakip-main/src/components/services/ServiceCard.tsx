import Link from "next/link";

import { PriorityBadge, StatusBadge } from "@/components/services/StatusBadge";
import type { Service, ServiceLookup } from "@/lib/data";
import { feeLabels, financeStatusLabels, formatCurrency, formatDateTime } from "@/lib/labels";

type ServiceCardProps = {
  service: Service;
  lookup: ServiceLookup;
  href: string;
};

export function ServiceCard({ service, lookup, href }: ServiceCardProps) {
  const product = service.product_group_id
    ? lookup.products.get(service.product_group_id)?.name
    : null;
  const type = service.service_type_id
    ? lookup.types.get(service.service_type_id)?.name
    : null;
  const member = service.member_id ? lookup.members.get(service.member_id) : null;

  return (
    <Link
      className="block overflow-hidden rounded-xl bg-panel transition hover:-translate-y-0.5 hover:shadow-lg"
      href={href}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Top accent bar for urgent */}
      {service.priority === "urgent" ? (
        <div className="h-1 w-full bg-accent" />
      ) : null}

      <div className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{service.customer_name}</h3>
              <Chip label={service.service_number} />
              <StatusBadge status={service.status} />
              {service.priority !== "normal" ? (
                <PriorityBadge priority={service.priority} />
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-foreground/60">
              {service.address}{service.district ? ` · ${service.district}` : ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip label={`Site: ${service.site_id}`} />
              <Chip label={`Finans: ${financeStatusLabels[service.finance_status]}`} />
              {product ? <Chip label={product} /> : null}
              {type ? <Chip label={type} /> : null}
              {service.project_name ? <Chip label={service.project_name} /> : null}
            </div>
          </div>

          <div className="shrink-0 text-sm md:text-right">
            <p className="font-semibold text-foreground">{member?.full_name ?? "Üye atanmamış"}</p>
            <p className="mt-0.5 text-foreground/55">{formatDateTime(service.scheduled_at)}</p>
            <p className="mt-1.5 text-xs font-medium text-accent">
              {feeLabels[service.fee_type]} · {formatCurrency(service.amount, service.currency)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-panel-muted px-2 py-0.5 text-xs text-foreground/65">
      {label}
    </span>
  );
}
