import Link from "next/link";
import { KeyRound, Settings } from "lucide-react";

import { refreshSubcontractorTrustScoresAction } from "@/app/actions";
import { MemberManagementPanel } from "@/components/admin/MemberManagementPanel";
import { PageHeader } from "@/components/layout/AppShell";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, subcontractorTrustGradeLabels } from "@/lib/labels";

export default async function ManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { error, ok } = await searchParams;
  const [membersResult, trustScoresResult, subcontractorsResult] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("subcontractor_trust_scores").select("*").order("score", { ascending: false }),
    supabase.from("subcontractors").select("*").order("name"),
  ]);
  const members = membersResult.data ?? [];
  const trustScores = trustScoresResult.data ?? [];
  const subcontractorsById = new Map((subcontractorsResult.data ?? []).map((item) => [item.id, item]));

  return (
    <>
      <PageHeader
        subtitle="Üye yönetimi, API erişimi ve sistem araçları"
        title="Yönetim Paneli"
      />

      <section className="mb-5 grid gap-3 md:grid-cols-2">
        <Link
          className="rounded-xl border border-border bg-panel p-4 transition hover:border-accent/35 hover:shadow-md"
          href="/api/v1/info"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-surface text-accent">
              <KeyRound size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold">API Bilgisi ve Tokenlar</h2>
              <p className="mt-1 text-sm text-foreground/60">
                Servis durum API dokümanı, bearer token üretme ve token silme.
              </p>
            </div>
          </div>
        </Link>
        <Link
          className="rounded-xl border border-border bg-panel p-4 transition hover:border-accent/35 hover:shadow-md"
          href="/admin/settings"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-panel-muted text-foreground/70">
              <Settings size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold">Sistem Ayarları</h2>
              <p className="mt-1 text-sm text-foreground/60">
                Ürün grupları, servis tipleri, taşeronlar ve fotoğraf kuralları.
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="mb-5 rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-semibold">Taşeron Güven Skoru</h2>
            <p className="text-sm text-foreground/60">
              Tamamlanma, zamanlama, fatura eşleşmesi, kalite ve AI alarm risklerine göre hesaplanır.
            </p>
          </div>
          <form action={refreshSubcontractorTrustScoresAction}>
            <SubmitButton
              className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
              label="Skorları Yenile"
              pendingLabel="Hesaplanıyor..."
            />
          </form>
        </div>

        {trustScores.length === 0 ? (
          <p className="rounded-lg bg-panel-muted px-3 py-4 text-sm text-foreground/55">
            Henüz hesaplanmış taşeron skoru yok.
          </p>
        ) : (
          <div className="space-y-2">
            {trustScores.map((score) => {
              const subcontractor = subcontractorsById.get(score.subcontractor_id);
              return (
                <div className="rounded-lg border border-border bg-background px-4 py-3" key={score.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{subcontractor?.name ?? score.subcontractor_id}</h3>
                        <span className="rounded-md bg-panel-muted px-2 py-0.5 text-xs text-foreground/60">
                          {subcontractorTrustGradeLabels[score.grade]}
                        </span>
                        <span className="rounded-md bg-panel-muted px-2 py-0.5 text-xs text-foreground/60">
                          Skor {score.score}/100
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-foreground/55">
                        Son hesaplama: {formatDateTime(score.computed_at)}
                      </p>
                    </div>
                    <div className="grid gap-2 text-xs text-foreground/65 sm:grid-cols-3 lg:min-w-[460px]">
                      <Metric label="Servis" value={`${score.completed_count}/${score.service_count}`} />
                      <Metric label="Zaman" value={`%${score.on_time_rate}`} />
                      <Metric label="Fatura" value={`%${score.invoice_match_rate}`} />
                      <Metric label="Bütçe" value={`%${score.budget_adherence_rate}`} />
                      <Metric label="Kalite" value={`%${score.quality_score}`} />
                      <Metric label="Alarm Cezası" value={`-${score.alert_penalty}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <MemberManagementPanel
        error={error}
        members={members}
        ok={ok}
        returnTo="/admin/management"
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel-muted px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-foreground/45">{label}</p>
      <p className="mt-1 font-medium text-foreground/80">{value}</p>
    </div>
  );
}
