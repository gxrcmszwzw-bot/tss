import { createServiceAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { ServiceForm } from "@/components/services/ServiceForm";
import { requireProfile } from "@/lib/auth";

export default async function MemberNewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireProfile();
  const { error } = await searchParams;
  const [products, types, subcontractors, regions, catalogItems] = await Promise.all([
    supabase.from("product_groups").select("*").eq("is_active", true).order("name"),
    supabase.from("service_types").select("*").eq("is_active", true).order("name"),
    supabase.from("subcontractors").select("*").eq("is_active", true).order("name"),
    supabase.from("regions").select("*").eq("is_active", true).order("name"),
    supabase.from("catalog_items").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <>
      <PageHeader subtitle="Yalnızca kendi adınıza servis kaydı açabilirsiniz" title="Yeni Servis Kaydı" />
      {error ? (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </div>
      ) : null}
      <ServiceForm
        action={createServiceAction}
        members={[]}
        mode="create"
        products={products.data ?? []}
        catalogItems={catalogItems.data ?? []}
        regions={regions.data ?? []}
        role="member"
        serviceTypes={types.data ?? []}
        subcontractors={subcontractors.data ?? []}
      />
    </>
  );
}
