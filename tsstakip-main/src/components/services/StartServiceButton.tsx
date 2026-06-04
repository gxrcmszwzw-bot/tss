"use client";

import { useMemo, useState } from "react";

import { distanceBetweenMeters } from "@/lib/geofence";
import { SubmitButton } from "@/components/ui/SubmitButton";

type StartServiceButtonProps = {
  serviceId: string;
  targetLatitude: number | null;
  targetLongitude: number | null;
  radiusMeters: number;
  action: (formData: FormData) => void | Promise<void>;
};

export function StartServiceButton({
  serviceId,
  targetLatitude,
  targetLongitude,
  radiusMeters,
  action,
}: StartServiceButtonProps) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const distance = useMemo(() => {
    if (
      latitude === null ||
      longitude === null ||
      targetLatitude === null ||
      targetLongitude === null
    ) {
      return null;
    }

    return distanceBetweenMeters(latitude, longitude, targetLatitude, targetLongitude);
  }, [latitude, longitude, targetLatitude, targetLongitude]);

  const isConfigured = targetLatitude !== null && targetLongitude !== null;
  const isWithinFence = distance !== null && distance <= radiusMeters;

  async function resolveLocation() {
    if (!navigator.geolocation) {
      setError("Bu cihaz geolocation desteklemiyor.");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsLocating(false);
      },
      (geoError) => {
        setError(geoError.message || "Konum alınamadı.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Geofence Başlatma</h3>
          <p className="text-sm text-foreground/60">
            İşi başlatmak için servis noktasına {radiusMeters} metre içinde olmalısınız.
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            Hedef:{" "}
            {isConfigured
              ? `${targetLatitude?.toFixed(5)}, ${targetLongitude?.toFixed(5)}`
              : "Koordinat tanımlı değil"}
          </p>
        </div>
        <button
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
          disabled={isLocating}
          onClick={() => void resolveLocation()}
          type="button"
        >
          {isLocating ? "Konum Alınıyor..." : "Konumumu Kontrol Et"}
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Metric
          label="Mevcut Konum"
          value={
            latitude !== null && longitude !== null
              ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
              : "Henüz ölçülmedi"
          }
        />
        <Metric
          label="Mesafe"
          value={distance !== null ? `${Math.round(distance)} m` : "-"}
        />
        <Metric
          label="Durum"
          value={
            !isConfigured
              ? "Koordinat eksik"
              : isWithinFence
                ? "Başlatmaya uygun"
                : "Alan dışında"
          }
        />
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <form action={action} className="mt-4">
        <input name="id" type="hidden" value={serviceId} />
        <input name="current_latitude" type="hidden" value={latitude ?? ""} />
        <input name="current_longitude" type="hidden" value={longitude ?? ""} />
        <SubmitButton
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={!isConfigured || !isWithinFence}
          label="İşi Başlat"
          pendingLabel="Başlatılıyor..."
        />
      </form>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/45">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
