"use server";

import { revalidatePath } from "next/cache";

import {
  deleteServiceStatusToken,
  generateServiceStatusToken,
  getServiceStatusTokens,
  type ApiTokenRecord,
} from "@/lib/api-tokens";
import { requireAdmin } from "@/lib/auth";

export type TokenActionState = {
  error?: string;
  message?: string;
  token?: string;
  tokens?: ApiTokenRecord[];
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function manageApiTokenAction(
  _state: TokenActionState,
  formData: FormData,
): Promise<TokenActionState> {
  const { user } = await requireAdmin();
  const intent = formData.get("intent");

  try {
    if (intent === "delete") {
      const tokenId = formData.get("token_id");
      if (typeof tokenId !== "string" || !tokenId) {
        return {
          error: "Silinecek token bulunamadı.",
          tokens: await getServiceStatusTokens().catch(() => []),
        };
      }

      await deleteServiceStatusToken(tokenId);
      revalidatePath("/api/v1/info");
      return {
        message: "Bearer token silindi.",
        tokens: await getServiceStatusTokens(),
      };
    }

    const { token, tokens } = await generateServiceStatusToken(user.id);
    revalidatePath("/api/v1/info");
    return {
      message: "Yeni bearer token üretildi.",
      token,
      tokens,
    };
  } catch (error) {
    return {
      error: formatError(error),
      tokens: await getServiceStatusTokens().catch(() => []),
    };
  }
}
