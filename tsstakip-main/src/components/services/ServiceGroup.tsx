import { CollapsiblePanel } from "@/components/services/CollapsiblePanel";
import { ServiceCard } from "@/components/services/ServiceCard";
import type { Service, ServiceLookup } from "@/lib/data";

type ServiceGroupProps = {
  title: string;
  services: Service[];
  lookup: ServiceLookup;
  baseHref: string;
};

export function ServiceGroup({
  title,
  services,
  lookup,
  baseHref,
}: ServiceGroupProps) {
  return (
    <CollapsiblePanel count={services.length} title={title}>
      {services.length ? (
        services.map((service) => (
          <ServiceCard
            href={`${baseHref}/${service.id}`}
            key={service.id}
            lookup={lookup}
            service={service}
          />
        ))
      ) : (
        <p className="rounded-lg bg-panel-muted px-3 py-8 text-center text-sm text-foreground/50">
          Bu grupta kayıt yok.
        </p>
      )}
    </CollapsiblePanel>
  );
}
