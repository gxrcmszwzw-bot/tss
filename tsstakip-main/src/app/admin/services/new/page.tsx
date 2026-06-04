import { createServiceAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { ServiceForm } from "@/components/services/ServiceForm";
import { requireAdmin } from "@/lib/auth";

export default async function AdminNewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await searchParams;
  const [products, types, members, subcontractors, regions, catalogItems] = await Promise.all([
    supabase.from("product_groups").select("*").eq("is_active", true).order("name"),
    supabase.from("service_types").select("*").eq("is_active", true).order("name"),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("subcontractors").select("*").eq("is_active", true).order("name"),
    supabase.from("regions").select("*").eq("is_active", true).order("name"),
    supabase.from("catalog_items").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <>
      <PageHeader subtitle="4 adımlı servis kayıt formu" title="Yeni Servis" />
      {error ? (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </div>
      ) : null}
      <ServiceForm
        action={createServiceAction}
        members={members.data ?? []}
        mode="create"
        products={products.data ?? []}
        catalogItems={catalogItems.data ?? []}
        regions={regions.data ?? []}
        role="admin"
        serviceTypes={types.data ?? []}
        subcontractors={subcontractors.data ?? []}
      />
    </>
  );
}
