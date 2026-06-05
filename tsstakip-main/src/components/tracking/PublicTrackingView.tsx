"use client";

import { useEffect, useMemo, useState } from "react";

import { formatDateTime, statusLabels } from "@/lib/labels";
import type { PublicTrackingSnapshot } from "@/lib/tracking";

type PublicTrackingViewProps = {
  initialTracking: PublicTrackingSnapshot;
  initialProgress: number;
  initialStage: string;
};

type TrackingResponse = {
  ok: true;
  tracking: PublicTrackingSnapshot;
  progress: number;
  stage: string;
};

export function PublicTrackingView({
  initialTracking,
  initialProgress,
  initialStage,
}: PublicTrackingViewProps) {
  const [tracking, setTracking] = useState(initialTracking);
  const [progress, setProgress] = useState(initialProgress);
  const [stage, setStage] = useState(initialStage);

  const endpoint = useMemo(
    () => `/api/public-tracking/${initialTracking.token}`,
    [initialTracking.token],
  );

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as TrackingResponse;
      if (!active || !payload.ok) return;
      setTracking(payload.tracking);
      setProgress(payload.progress);
      setStage(payload.stage);
    };

    const intervalId = window.setInterval(refresh, 15_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [endpoint]);

  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <header className="rounded-2xl border border-border bg-panel p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Canlı Takip</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Servis {tracking.serviceNumber}</h1>
        <p className="mt-2 text-sm text-foreground/65">
          {tracking.customerName} · {tracking.address}
          {tracking.district ? ` / ${tracking.district}` : ""}
        </p>
        <div className="mt-4 rounded-full bg-panel-muted p-1">
          <div
            className="h-3 rounded-full bg-accent transition-all"
            style={{ width: `${Math.max(progress, 8)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="font-semibold text-foreground">{stage}</span>
          <span className="rounded-full bg-accent/10 px-3 py-1 font-medium text-accent">
            {statusLabels[tracking.status]}
          </span>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard label="Planlanan" value={formatDateTime(tracking.scheduledAt)} />
        <InfoCard label="Başlangıç" value={formatDateTime(tracking.startedAt)} />
        <InfoCard
          label="Son Konum Güncellemesi"
          value={formatDateTime(tracking.technicianLastSeenAt)}
        />
        <InfoCard
          label="Tahmini Varış"
          value={
            tracking.technicianArrivedAt
              ? "Ekip lokasyona ulaştı"
              : tracking.technicianEtaMinutes !== null
                ? `${tracking.technicianEtaMinutes} dk`
                : "Paylaşılmadı"
          }
        />
      </div>

      <section className="rounded-2xl border border-border bg-panel p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
        <h2 className="text-lg font-semibold text-foreground">Konum</h2>
        <div className="mt-3 space-y-3 text-sm text-foreground/70">
          <p>
            Hedef nokta:{" "}
            {tracking.serviceLatitude !== null && tracking.serviceLongitude !== null
              ? `${tracking.serviceLatitude.toFixed(5)}, ${tracking.serviceLongitude.toFixed(5)}`
              : "Tanımlı değil"}
          </p>
          <p>
            Ekip konumu:{" "}
            {tracking.technicianLatitude !== null && tracking.technicianLongitude !== null
              ? `${tracking.technicianLatitude.toFixed(5)}, ${tracking.technicianLongitude.toFixed(5)}`
              : "Henüz paylaşılmadı"}
          </p>
          <div className="flex flex-wrap gap-3">
            {tracking.serviceLatitude !== null && tracking.serviceLongitude !== null ? (
              <a
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground hover:border-accent/40 hover:text-accent"
                href={`https://www.google.com/maps?q=${tracking.serviceLatitude},${tracking.serviceLongitude}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Hedefi Haritada Aç
              </a>
            ) : null}
            {tracking.technicianLatitude !== null && tracking.technicianLongitude !== null ? (
              <a
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground hover:border-accent/40 hover:text-accent"
                href={`https://www.google.com/maps?q=${tracking.technicianLatitude},${tracking.technicianLongitude}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Ekibi Haritada Aç
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
