import { MemberManagementPanel } from "@/components/admin/MemberManagementPanel";
import { PageHeader } from "@/components/layout/AppShell";
import { requireAdmin } from "@/lib/auth";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error, ok } = await searchParams;
  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  return (
    <>
      <PageHeader subtitle="Admin üyeleri ekler, rollerini değiştirir ve pasife alır" title="Üyeler" />
      <MemberManagementPanel error={error} members={members ?? []} ok={ok} />
    </>
  );
}
