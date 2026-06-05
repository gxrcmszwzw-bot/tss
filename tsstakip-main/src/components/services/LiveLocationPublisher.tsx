"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LiveLocationPublisherProps = {
  serviceId: string;
  enabled: boolean;
};

export function LiveLocationPublisher({
  serviceId,
  enabled,
}: LiveLocationPublisherProps) {
  const geolocationSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("Konum paylaşımı beklemede.");
  const lastSentAtRef = useRef<number>(0);

  const endpoint = useMemo(() => `/api/services/${serviceId}/live-location`, [serviceId]);

  useEffect(() => {
    if (!enabled || !geolocationSupported) return;

    let active = true;

    const sendLocation = () => {
      setStatus("sending");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!active) return;
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });

            if (!response.ok) {
              throw new Error("Konum yayını gönderilemedi.");
            }

            lastSentAtRef.current = Date.now();
            setStatus("success");
            setMessage("Canlı konum güncellendi.");
          } catch (error) {
            setStatus("error");
            setMessage(error instanceof Error ? error.message : "Konum gönderiminde hata oluştu.");
          }
        },
        (error) => {
          if (!active) return;
          setStatus("error");
          setMessage(error.message || "Konum alınamadı.");
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
      );
    };

    sendLocation();
    const intervalId = window.setInterval(() => {
      if (Date.now() - lastSentAtRef.current >= 20_000) {
        sendLocation();
      }
    }, 20_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [enabled, endpoint, geolocationSupported]);

  if (!enabled) return null;

  if (!geolocationSupported) {
    return (
      <div className="rounded-lg border border-danger/20 bg-danger/8 px-3 py-3 text-sm text-danger">
        Bu cihaz konum paylaşımını desteklemiyor.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-panel-muted px-3 py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-foreground">Canlı Konum Yayını</p>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
            status === "success"
              ? "bg-emerald-500/15 text-emerald-700"
              : status === "error"
                ? "bg-danger/10 text-danger"
                : status === "sending"
                  ? "bg-accent/10 text-accent"
                  : "bg-panel text-foreground/65"
          }`}
        >
          {status === "success"
            ? "Aktif"
            : status === "error"
              ? "Hata"
              : status === "sending"
                ? "Gönderiliyor"
                : "Beklemede"}
        </span>
      </div>
      <p className="mt-2 text-xs text-foreground/65">{message}</p>
    </div>
  );
}
