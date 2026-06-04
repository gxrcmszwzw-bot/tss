import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Eksik ortam degiskeni: ${name}`);
  }
  return value;
}

async function main() {
  loadEnvFile(path.resolve(".env.local"));

  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY veya SUPABASE_SECRET_KEY tanimli olmali.");
  }

  const [, , email, password, ...nameParts] = process.argv;
  const fullName = nameParts.join(" ").trim() || "Admin";

  if (!email || !password) {
    console.error("Kullanim: node scripts/create-admin.mjs <email> <password> [full name]");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Auth kullanicilari alinamadi: ${listError.message}`);
  }

  const existingUser = existingUsers.users.find((user) => user.email === email);

  let userId = existingUser?.id;

  if (!userId) {
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "admin",
      },
    });

    if (createError || !createdUser.user) {
      throw new Error(`Admin kullanicisi olusturulamadi: ${createError?.message ?? "Bilinmeyen hata"}`);
    }

    userId = createdUser.user.id;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    role: "admin",
    is_active: true,
    phone: null,
  });

  if (profileError) {
    throw new Error(`Admin profil yazilamadi: ${profileError.message}`);
  }

  let organizationId = null;
  const { data: existingOrganizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (organizationsError) {
    throw new Error(`Organizasyonlar okunamadi: ${organizationsError.message}`);
  }

  organizationId = existingOrganizations?.[0]?.id ?? null;

  if (!organizationId) {
    const { data: createdOrganization, error: organizationCreateError } = await supabase
      .from("organizations")
      .insert({
        name: "Default Organization",
        code: "default",
        is_active: true,
      })
      .select("id")
      .single();

    if (organizationCreateError || !createdOrganization) {
      throw new Error(
        `Varsayilan organizasyon olusturulamadi: ${organizationCreateError?.message ?? "Bilinmeyen hata"}`,
      );
    }

    organizationId = createdOrganization.id;
  }

  const { error: membershipError } = await supabase.from("organization_members").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role: "admin",
      is_active: true,
    },
    { onConflict: "organization_id,user_id" },
  );

  if (membershipError) {
    throw new Error(`Admin organizasyon uyeligi yazilamadi: ${membershipError.message}`);
  }

  console.log(`Admin hazir: ${email}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
