import "server-only";

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type ApiTokenRecord = {
  id: string;
  name: string;
  tokenPreview: string;
  tokenValue: string | null;
  createdAt: string;
  updatedAt: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function compareHashes(a: string, b: string) {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export async function getServiceStatusTokens(): Promise<ApiTokenRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id,name,token_preview,token_value,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((token) => ({
    id: token.id,
    name: token.name,
    tokenPreview: token.token_preview,
    tokenValue: token.token_value,
    createdAt: token.created_at,
    updatedAt: token.updated_at,
  }));
}

export async function generateServiceStatusToken(createdBy: string) {
  const token = `tss_${randomBytes(32).toString("base64url")}`;
  const tokenPreview = `...${token.slice(-8)}`;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("api_tokens")
    .insert({
      id: randomUUID(),
      name: "Service status callback",
      token_hash: hashToken(token),
      token_preview: tokenPreview,
      token_value: token,
      created_by: createdBy,
    });

  if (error) {
    throw error;
  }

  return {
    token,
    tokens: await getServiceStatusTokens(),
  };
}

export async function deleteServiceStatusToken(tokenId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("api_tokens")
    .delete()
    .eq("id", tokenId);

  if (error) {
    throw error;
  }
}

export async function validateServiceStatusBearer(token: string | null) {
  if (!token) return false;

  const supabase = getSupabaseAdminClient();
  const tokenHash = hashToken(token);
  const { data, error } = await supabase
    .from("api_tokens")
    .select("token_hash")
    .eq("token_hash", tokenHash)
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;

  return compareHashes(tokenHash, data.token_hash);
}
