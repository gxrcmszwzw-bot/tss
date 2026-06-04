import Link from "next/link";
import { Home, KeyRound, ShieldCheck } from "lucide-react";

import { ApiTokenManager } from "@/components/api/ApiTokenManager";
import { ApiInfoLoginForm } from "@/components/auth/ApiInfoLoginForm";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getServiceStatusTokens } from "@/lib/api-tokens";
import { getSessionProfile } from "@/lib/auth";

const endpoint = "/api/v1/service-status";

export default async function ApiInfoPage() {
  const { profile } = await getSessionProfile();
  const isAdmin = profile?.is_active && profile.role === "admin";

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background px-5 py-10 text-foreground">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <section>
            <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-accent text-white">
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent">
              TSS Takip API
            </p>
            <h1 className="mt-2 text-3xl font-bold">API bilgi sayfası</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-foreground/65">
              Bu sayfa servis durum callback API kullanımını gösterir. İçeriği görmek için aktif bir admin hesabıyla e-posta ve şifre kullanarak giriş yapın.
            </p>
          </section>
          <section className="rounded-xl bg-panel p-6" style={{ boxShadow: "var(--shadow-sm)" }}>
            <ApiInfoLoginForm />
          </section>
        </div>
      </main>
    );
  }

  const tokens = await getServiceStatusTokens().catch(() => []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="bg-accent px-5 py-5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/75">TSS Takip API</p>
            <h1 className="text-2xl font-bold">Servis Durum Callback</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-md border border-white/25 px-3 py-2 text-sm font-semibold text-white/90 transition hover:border-white/45 hover:bg-white/10 hover:text-white"
              href="/admin"
            >
              <Home size={16} aria-hidden="true" />
              Ana Sayfa
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-4">
          <Card title="Bearer Token Yönetimi">
            <ApiTokenManager initialTokens={tokens} />
          </Card>

          <Card title="Endpoint">
            <Code>{`POST ${endpoint}`}</Code>
            <p className="mt-3 text-sm leading-6 text-foreground/65">
              Dış sistem servis numarası ve kabul sonucunu gönderir. Kabul true ise servis durumu <strong>Onaylandı</strong>, false ise <strong>Reddedildi</strong> yapılır.
            </p>
          </Card>

          <Card title="Kimlik Doğrulama">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-surface text-accent">
                <KeyRound size={17} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">Header ile bearer token gönderilir.</p>
                <p className="mt-1 text-sm text-foreground/65">
                  Token yukarıdaki bölümden üretilir. Üretilen tokenlar silinene kadar geçerlidir.
                </p>
              </div>
            </div>
            <Code>{`Authorization: Bearer TSS_TOKEN_DEGERI`}</Code>
          </Card>

          <Card title="Body">
            <Code>{`{
  "service_number": "SRV-2026-000001",
  "accepted": true
}`}</Code>
          </Card>
        </section>

        <section className="space-y-4">
          <Card title="cURL Örneği">
            <Code>{`curl -X POST "https://tsstakip.vercel.app${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TSS_TOKEN_DEGERI" \\
  -d '{
    "service_number": "SRV-2026-000001",
    "accepted": true
  }'`}</Code>
          </Card>

          <Card title="Başarılı Yanıt">
            <Code>{`{
  "ok": true,
  "service": {
    "id": "...",
    "service_number": "SRV-2026-000001",
    "status": "approved",
    "customer_approved_at": "2026-05-07T10:30:00.000Z",
    "customer_rejected_at": null
  }
}`}</Code>
          </Card>

          <Card title="Hata Yanıtları">
            <ul className="space-y-2 text-sm text-foreground/70">
              <li><code>401</code> Eksik veya geçersiz bearer token.</li>
              <li><code>400</code> Eksik servis numarası veya boolean olmayan <code>accepted</code>.</li>
              <li><code>404</code> Servis numarası bulunamadı.</li>
              <li><code>500</code> Sunucu veya ortam değişkeni hatası.</li>
            </ul>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-xl bg-panel p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-panel-muted p-4 text-sm leading-6 text-foreground">
      <code>{children}</code>
    </pre>
  );
}
