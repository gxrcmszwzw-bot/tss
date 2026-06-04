"use client";

import { Loader2, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginState = "idle" | "loading";
const rememberedEmailKey = "tss-takip-remembered-email";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(() =>
    typeof window === "undefined" ? "" : (window.localStorage.getItem(rememberedEmailKey) ?? ""),
  );
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() =>
    typeof window === "undefined" ? false : Boolean(window.localStorage.getItem(rememberedEmailKey)),
  );
  const [status, setStatus] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("loading");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError("Oturum açılamadı. Lütfen tekrar deneyin.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role,is_active")
        .eq("id", userId)
        .single();

      if (profileError) {
        setError(`Profil okunamadı: ${profileError.message}`);
        return;
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        setError("Bu kullanıcı pasif durumda. Lütfen admin ile iletişime geçin.");
        return;
      }

      if (rememberMe) {
        window.localStorage.setItem(rememberedEmailKey, email.trim());
      } else {
        window.localStorage.removeItem(rememberedEmailKey);
      }

      router.replace(profile.role === "admin" ? "/admin" : "/member");
      router.refresh();
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground/80" htmlFor="email">
          E-posta
        </label>
        <div
          className="flex h-12 items-center gap-3 rounded-lg border border-border bg-panel-muted px-3 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15"
        >
          <UserRound className="text-foreground/40" size={18} aria-hidden="true" />
          <input
            autoComplete="email"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-foreground/35"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ornek@sirket.com"
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground/80" htmlFor="password">
          Şifre
        </label>
        <div
          className="flex h-12 items-center gap-3 rounded-lg border border-border bg-panel-muted px-3 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15"
        >
          <LockKeyhole className="text-foreground/40" size={18} aria-hidden="true" />
          <input
            autoComplete="current-password"
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-foreground/35"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={password}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground/70">
        <input
          checked={rememberMe}
          className="size-4 rounded border-border accent-[var(--accent)]"
          onChange={(event) => setRememberMe(event.target.checked)}
          type="checkbox"
        />
        Beni hatırla
      </label>

      {error ? (
        <div className="rounded-lg border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <button
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white shadow-sm transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status === "loading"}
        type="submit"
      >
        {status === "loading" ? (
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
        ) : null}
        {status === "loading" ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}
