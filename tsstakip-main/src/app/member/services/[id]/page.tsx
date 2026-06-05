import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/AppShell";
import { ServiceDetail } from "@/components/services/ServiceDetail";
import { requireProfile } from "@/lib/auth";

export default async function MemberServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, profile } = await requireProfile();

  const [service, products, types, subcontractors, photos, photoRules, regions, catalogItems, voiceNotes, photoInspections, customerSites] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).eq("member_id", user.id).single(),
    supabase.from("product_groups").select("*").eq("is_active", true).order("name"),
    supabase.from("service_types").select("*").eq("is_active", true).order("name"),
    supabase.from("subcontractors").select("*").eq("is_active", true).order("name"),
    supabase.from("service_photos").select("*").eq("service_id", id).order("taken_at", { ascending: false }),
    supabase.from("photo_rules").select("gallery_upload_enabled").limit(1).maybeSingle(),
    supabase.from("regions").select("*").eq("is_active", true).order("name"),
    supabase.from("catalog_items").select("*").eq("is_active", true).order("name"),
    supabase.from("service_voice_notes").select("*").eq("service_id", id).order("created_at", { ascending: false }),
    supabase.from("service_photo_inspections").select("*").eq("service_id", id).order("created_at", { ascending: false }),
    supabase.from("customer_sites").select("*").eq("is_active", true).order("site_code"),
  ]);

  if (!service.data) notFound();

  return (
    <>
      <PageHeader subtitle="Servis kaydı detayları" title="Servis Detayı" />
      <ServiceDetail
        galleryEnabled={photoRules.data?.gallery_upload_enabled ?? false}
        members={[profile]}
        products={products.data ?? []}
        catalogItems={catalogItems.data ?? []}
        customerSites={customerSites.data ?? []}
        photos={photos.data ?? []}
        photoInspections={photoInspections.data ?? []}
        regions={regions.data ?? []}
        role="member"
        service={service.data}
        serviceTypes={types.data ?? []}
        subcontractors={subcontractors.data ?? []}
        voiceNotes={voiceNotes.data ?? []}
      />
    </>
  );
}
