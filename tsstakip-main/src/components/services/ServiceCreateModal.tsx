"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { ServiceForm } from "@/components/services/ServiceForm";
import type {
  CatalogItem,
  CustomerSite,
  ProductGroup,
  Profile,
  Region,
  ServiceType,
  Subcontractor,
} from "@/lib/data";

type ServiceCreateModalProps = {
  action: (formData: FormData) => void | Promise<void>;
  buttonLabel: string;
  members: Profile[];
  products: ProductGroup[];
  catalogItems: CatalogItem[];
  customerSites: CustomerSite[];
  regions: Region[];
  role: "admin" | "member";
  serviceTypes: ServiceType[];
  subcontractors: Subcontractor[];
  title: string;
};

export function ServiceCreateModal({
  action,
  buttonLabel,
  members,
  products,
  catalogItems,
  customerSites,
  regions,
  role,
  serviceTypes,
  subcontractors,
  title,
}: ServiceCreateModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition active:scale-[0.97] hover:bg-accent-strong"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus size={16} aria-hidden="true" />
        {buttonLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 px-4 py-6">
          <div className="mx-auto max-w-4xl rounded-xl bg-background text-foreground shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background px-5 py-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                aria-label="Pencereyi kapat"
                className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground/60 transition hover:border-accent/40 hover:text-accent"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <div className="p-5">
              <ServiceForm
                action={action}
                members={members}
                mode="create"
                products={products}
                catalogItems={catalogItems}
                customerSites={customerSites}
                regions={regions}
                role={role}
                serviceTypes={serviceTypes}
                subcontractors={subcontractors}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
