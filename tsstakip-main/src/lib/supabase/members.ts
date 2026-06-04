import "server-only";

import { getSupabaseAdminClient, getSupabaseAdminConfig } from "./admin";
import type { OrganizationRole, UserRole } from "./types";

type CreateMemberInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  organizationId: string;
};

type UpdateMemberInput = {
  fullName?: string;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
};

function getAuthEndpoint() {
  const { supabaseUrl, supabaseAdminKey } = getSupabaseAdminConfig();
  return { url: supabaseUrl, secret: supabaseAdminKey };
}

async function adminAuthFetch<T>(path: string, init: RequestInit): Promise<T> {
  const { url, secret } = getAuthEndpoint();
  const response = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      apikey: secret,
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { msg?: string; message?: string; error?: string };
      detail = parsed.msg ?? parsed.message ?? parsed.error ?? detail;
    } catch {
      // keep raw text
    }
    throw new Error(`Supabase Auth ${response.status}: ${detail}`);
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

type AuthAdminUser = {
  id: string;
  email?: string;
  phone?: string;
};

function roleToOrganizationRole(role: UserRole | undefined): OrganizationRole {
  return role === "admin" ? "admin" : "member";
}

export async function createMemberAccount(input: CreateMemberInput) {
  const role = input.role ?? "member";

  // Direct fetch — supabase-js v2.105.3 has a bug in auth.admin.createUser
  // that returns HTML parse errors. Using REST endpoint directly works.
  const response = await adminAuthFetch<AuthAdminUser | { user: AuthAdminUser }>(
    "/admin/users",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          full_name: input.fullName,
          phone: input.phone,
          role,
        },
      }),
    },
  );

  const user =
    "user" in response && response.user
      ? response.user
      : (response as AuthAdminUser);

  if (!user?.id) {
    throw new Error(
      `Auth API beklenen formatta yanıt vermedi: ${JSON.stringify(response).slice(0, 200)}`,
    );
  }

  // The handle_new_user trigger has already inserted the profile row from
  // user_metadata. Update it to make sure our values are authoritative.
  const supabase = getSupabaseAdminClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      phone: input.phone ?? null,
      role,
      is_active: true,
    })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(
      `Profil güncellenemedi: ${profileError.message}${profileError.details ? ` (${profileError.details})` : ""}`,
    );
  }

  const { error: membershipError } = await supabase
    .from("organization_members")
    .upsert(
      {
        organization_id: input.organizationId,
        user_id: user.id,
        role: roleToOrganizationRole(role),
        is_active: true,
      },
      { onConflict: "organization_id,user_id" },
    );

  if (membershipError) {
    throw new Error(`Organizasyon uyeligi yazilamadi: ${membershipError.message}`);
  }

  return user;
}

export async function updateMemberProfile(userId: string, input: UpdateMemberInput) {
  const supabase = getSupabaseAdminClient();
  const payload = {
    ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteMemberAccount(userId: string) {
  // Direct fetch — same bug as createUser in supabase-js v2.105.3
  await adminAuthFetch(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}
