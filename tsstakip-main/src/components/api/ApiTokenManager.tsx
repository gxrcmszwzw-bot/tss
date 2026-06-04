"use client";

import {
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useActionState, useState } from "react";

import {
  manageApiTokenAction,
  type TokenActionState,
} from "@/app/api/v1/info/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ApiTokenRecord } from "@/lib/api-tokens";
import { formatDateTime } from "@/lib/labels";

type ApiTokenManagerProps = {
  initialTokens: ApiTokenRecord[];
};

type TokenSecretProps = {
  token: string | null;
  preview: string;
};

export function ApiTokenManager({ initialTokens }: ApiTokenManagerProps) {
  const initialState: TokenActionState = { tokens: initialTokens };
  const [state, formAction, isPending] = useActionState(
    manageApiTokenAction,
    initialState,
  );
  const tokens = state.tokens ?? initialTokens;
  const latestToken = tokens[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-surface text-accent">
          <KeyRound size={17} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            {latestToken ? `Aktif token sayısı: ${tokens.length}` : "Aktif token yok"}
          </p>
          <p className="mt-1 text-sm text-foreground/65">
            {latestToken
              ? `Son üretim: ${formatDateTime(latestToken.createdAt)}`
              : "Token olmadan durum callback API authenticate olmaz."}
          </p>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-lg border border-danger/25 bg-danger/8 px-3 py-2 text-sm text-danger">
          {state.error}
        </div>
      ) : null}

      {state.message ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {state.message}
        </div>
      ) : null}

      <form action={formAction}>
        <input name="intent" type="hidden" value="generate" />
        <SubmitButton
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong disabled:opacity-60"
          disabled={isPending}
          pendingLabel="Üretiliyor..."
        >
          <RefreshCw size={15} aria-hidden="true" />
          Token Üret
        </SubmitButton>
      </form>

      <details className="overflow-hidden rounded-lg border border-border bg-background" open={tokens.length > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
          <span>Üretilmiş Tokenlar</span>
          <span className="flex items-center gap-2 text-foreground/55">
            {tokens.length}
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </summary>
        <div className="space-y-2 border-t border-border p-3">
          {tokens.length ? (
            tokens.map((token) => (
              <div className="rounded-lg bg-panel-muted p-3" key={token.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{token.tokenPreview}</p>
                    <p className="mt-0.5 text-xs text-foreground/55">
                      Üretildi: {formatDateTime(token.createdAt)}
                    </p>
                  </div>
                  <form action={formAction}>
                    <input name="intent" type="hidden" value="delete" />
                    <input name="token_id" type="hidden" value={token.id} />
                    <SubmitButton
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/8 px-3 text-sm font-semibold text-danger transition hover:bg-danger/15 disabled:opacity-60"
                      disabled={isPending}
                      pendingLabel="Siliniyor..."
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Sil
                    </SubmitButton>
                  </form>
                </div>
                <TokenSecret preview={token.tokenPreview} token={token.tokenValue} />
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-panel-muted px-3 py-6 text-center text-sm text-foreground/50">
              Henüz token üretilmedi.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

function TokenSecret({ preview, token }: TokenSecretProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [didCopy, setDidCopy] = useState(false);
  const visibleValue = token ?? `Eski token değeri saklanmamış (${preview})`;
  const maskedValue = token ? "•".repeat(Math.min(token.length, 48)) : "Eski token değeri saklanmamış";

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setDidCopy(true);
    window.setTimeout(() => setDidCopy(false), 1800);
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-panel p-3 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">
        {isVisible ? visibleValue : maskedValue}
      </code>
      <div className="flex gap-2">
        <button
          aria-label={isVisible ? "Tokenı gizle" : "Tokenı göster"}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:border-accent/40 hover:text-accent disabled:opacity-60"
          disabled={!token}
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          {isVisible ? (
            <EyeOff size={15} aria-hidden="true" />
          ) : (
            <Eye size={15} aria-hidden="true" />
          )}
          {isVisible ? "Gizle" : "Göster"}
        </button>
        <button
          aria-label="Tokenı kopyala"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
          disabled={!token}
          onClick={copyToken}
          type="button"
        >
          {didCopy ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <Copy size={15} aria-hidden="true" />
          )}
          {didCopy ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </div>
  );
}
