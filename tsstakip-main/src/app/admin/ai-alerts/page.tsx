import { PageHeader } from "@/components/layout/AppShell";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { reopenAiAlertAction, resolveAiAlertAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { aiRiskLabels, formatDateTime } from "@/lib/labels";

type SearchParams = Promise<{
  state?: string;
  error?: string;
}>;

export default async function AiAlertsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const state = params.state === "resolved" ? "resolved" : "open";

  const [openAlertsResult, resolvedAlertsResult] = await Promise.all([
    supabase
      .from("ai_alerts")
      .select("*")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_alerts")
      .select("*")
      .eq("is_resolved", true)
      .order("resolved_at", { ascending: false }),
  ]);

  const openAlerts = openAlertsResult.data ?? [];
  const resolvedAlerts = resolvedAlertsResult.data ?? [];
  const alerts = state === "resolved" ? resolvedAlerts : openAlerts;

  return (
    <>
      <PageHeader
        subtitle={`Açık: ${openAlerts.length} · Çözülen: ${resolvedAlerts.length}`}
        title="AI Alarm Merkezi"
      />

      {params.error ? (
        <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(params.error)}
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={state === "open"} href="/admin/ai-alerts">
          Açık Alarmlar
        </FilterChip>
        <FilterChip active={state === "resolved"} href="/admin/ai-alerts?state=resolved">
          Çözülenler
        </FilterChip>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-xl bg-panel p-8 text-center text-sm text-foreground/55" style={{ boxShadow: "var(--shadow-sm)" }}>
          Bu görünüm için alarm bulunamadı.
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div className="rounded-xl border border-border bg-panel p-4" key={alert.id} style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{alert.title}</h2>
                    <span className="rounded-md bg-panel-muted px-2 py-0.5 text-xs text-foreground/60">
                      {aiRiskLabels[alert.risk_level]}
                    </span>
                  </div>
                  {alert.detail ? <p className="mt-1 text-sm text-foreground/70">{alert.detail}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/55">
                    <span>Oluşturuldu: {formatDateTime(alert.created_at)}</span>
                    {alert.resolved_at ? <span>Çözüldü: {formatDateTime(alert.resolved_at)}</span> : null}
                    {alert.service_id ? (
                      <a className="font-medium text-accent hover:underline" href={`/admin/services/${alert.service_id}`}>
                        Servise git
                      </a>
                    ) : null}
                  </div>
                  {alert.resolved_note ? (
                    <p className="mt-2 rounded-md bg-panel-muted px-3 py-2 text-sm text-foreground/70">
                      <strong>Çözüm Notu:</strong> {alert.resolved_note}
                    </p>
                  ) : null}
                </div>

                {alert.is_resolved ? (
                  <form action={reopenAiAlertAction}>
                    <input name="alert_id" type="hidden" value={alert.id} />
                    <SubmitButton
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-panel px-4 py-2 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent"
                      label="Yeniden Aç"
                      pendingLabel="Açılıyor..."
                    />
                  </form>
                ) : (
                  <form action={resolveAiAlertAction} className="grid gap-2 sm:min-w-[260px]">
                    <input name="alert_id" type="hidden" value={alert.id} />
                    <input
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                      name="resolved_note"
                      placeholder="Çözüm notu"
                      required
                    />
                    <SubmitButton
                      className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
                      label="Alarmı Çöz"
                      pendingLabel="Kaydediliyor..."
                    />
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FilterChip({
  active,
  children,
  href,
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <a
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-accent text-white"
          : "border border-border bg-panel text-foreground/70 hover:border-accent/40 hover:text-accent"
      }`}
      href={href}
    >
      {children}
    </a>
  );
}
