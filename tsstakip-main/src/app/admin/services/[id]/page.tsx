import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/AppShell";
import { ServiceDetail } from "@/components/services/ServiceDetail";
import { requireAdmin } from "@/lib/auth";

export default async function AdminServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [service, products, types, members, subcontractors, photos, photoRules, negotiations, invoices, regions, catalogItems, voiceNotes, photoInspections] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).single(),
    supabase.from("product_groups").select("*").eq("is_active", true).order("name"),
    supabase.from("service_types").select("*").eq("is_active", true).order("name"),
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase.from("subcontractors").select("*").eq("is_active", true).order("name"),
    supabase.from("service_photos").select("*").eq("service_id", id).order("taken_at", { ascending: false }),
    supabase.from("photo_rules").select("gallery_upload_enabled").limit(1).maybeSingle(),
    supabase.from("service_negotiations").select("*").eq("service_id", id).order("created_at", { ascending: false }),
    supabase.from("service_invoices").select("*").eq("service_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("regions").select("*").eq("is_active", true).order("name"),
    supabase.from("catalog_items").select("*").eq("is_active", true).order("name"),
    supabase.from("service_voice_notes").select("*").eq("service_id", id).order("created_at", { ascending: false }),
    supabase.from("service_photo_inspections").select("*").eq("service_id", id).order("created_at", { ascending: false }),
  ]);

  if (!service.data) notFound();

  return (
    <>
      <PageHeader subtitle="Servis bilgileri ve düzenleme" title="Servis Detayı" />
      <ServiceDetail
        galleryEnabled={photoRules.data?.gallery_upload_enabled ?? false}
        members={members.data ?? []}
        negotiations={negotiations.data ?? []}
        products={products.data ?? []}
        catalogItems={catalogItems.data ?? []}
        photos={photos.data ?? []}
        photoInspections={photoInspections.data ?? []}
        regions={regions.data ?? []}
        role="admin"
        service={service.data}
        serviceTypes={types.data ?? []}
        subcontractors={subcontractors.data ?? []}
        invoices={invoices.data ?? []}
        voiceNotes={voiceNotes.data ?? []}
      />
    </>
  );
}
