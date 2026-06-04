import { createServiceAction } from "@/app/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { ServiceGroup } from "@/components/services/ServiceGroup";
import { ServiceCreateModal } from "@/components/services/ServiceCreateModal";
import { requireProfile } from "@/lib/auth";
import { createLookup } from "@/lib/data";

export default async function MemberPage() {
  const { supabase, user, profile } = await requireProfile();

  const [servicesResult, productsResult, typesResult, subcontractorsResult, regionsResult, catalogItemsResult] =
    await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("member_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("product_groups").select("*").order("name"),
      supabase.from("service_types").select("*").order("name"),
      supabase.from("subcontractors").select("*").eq("is_active", true).order("name"),
      supabase.from("regions").select("*").eq("is_active", true).order("name"),
      supabase.from("catalog_items").select("*").eq("is_active", true).order("name"),
    ]);

  const services = servicesResult.data ?? [];
  const lookup = createLookup({
    products: productsResult.data,
    types: typesResult.data,
    members: [profile],
  });
  const active = services.filter((item) => item.status !== "completed");
  const completed = services.filter((item) => item.status === "completed");

  return (
    <>
      <PageHeader
        actions={
          <ServiceCreateModal
            action={createServiceAction}
            buttonLabel="Yeni Kayıt"
            catalogItems={catalogItemsResult.data ?? []}
            members={[]}
            products={productsResult.data ?? []}
            regions={regionsResult.data ?? []}
            role="member"
            serviceTypes={typesResult.data ?? []}
            subcontractors={subcontractorsResult.data ?? []}
            title="Yeni Servis Kaydı"
          />
        }
        subtitle="Kendi servis taleplerinizi oluşturun ve takip edin"
        title={`Merhaba, ${profile.full_name}`}
      />
      <section className="space-y-4">
        <ServiceGroup baseHref="/member/services" lookup={lookup} services={active} title="Aktif Servislerim" />
        <ServiceGroup baseHref="/member/services" lookup={lookup} services={completed} title="Tamamlananlar" />
      </section>
    </>
  );
}
