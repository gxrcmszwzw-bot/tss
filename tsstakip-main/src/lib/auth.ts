import { redirect } from "next/navigation";
import { cache } from "react";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type OrganizationMembership =
  Database["public"]["Tables"]["organization_members"]["Row"] & {
    organization: Database["public"]["Tables"]["organizations"]["Row"] | null;
  };

export const getSessionProfile = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: organizationMembership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(*)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const typedOrganizationMembership =
    organizationMembership as OrganizationMembership | null;

  return {
    supabase,
    user,
    profile,
    organizationMembership: typedOrganizationMembership,
    activeOrganizationId: typedOrganizationMembership?.organization_id ?? null,
  };
});

export async function requireProfile() {
  const session = await getSessionProfile();

  if (!session.user || !session.profile?.is_active) {
    redirect("/");
  }

  return {
    supabase: session.supabase,
    user: session.user,
    profile: session.profile,
    organizationMembership: session.organizationMembership,
    activeOrganizationId: session.activeOrganizationId,
  };
}

export async function requireAdmin() {
  const session = await requireProfile();

  const organizationRole = session.organizationMembership?.role;
  const isOrgAdmin = organizationRole === "owner" || organizationRole === "admin";

  if (session.profile.role !== "admin" && !isOrgAdmin) {
    redirect("/member");
  }

  return session;
}
