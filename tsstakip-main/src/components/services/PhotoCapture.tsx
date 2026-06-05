"use client";

import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { enqueueOfflineEntry, storeOfflineAsset } from "@/lib/offline-queue";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PhotoType, ServiceStatus } from "@/lib/supabase/types";

type PhotoCaptureProps = {
  organizationId: string;
  serviceId: string;
  photoType: PhotoType;
  label: string;
  galleryEnabled?: boolean;
  serviceStatus: ServiceStatus;
  disabledReason?: string;
};

export function PhotoCapture({
  organizationId,
  serviceId,
  photoType,
  label,
  galleryEnabled = true,
  serviceStatus,
  disabledReason,
}: PhotoCaptureProps) {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    setMessage(null);
    setIsUploading(true);

    try {
      if (!navigator.onLine) {
        const assetId = await storeOfflineAsset(
          file,
          file.name,
          file.type || "image/jpeg",
        );
        enqueueOfflineEntry({
          kind: "service_photo_upload",
          assetId,
          payload: {
            service_id: serviceId,
            photo_type: photoType,
          },
        });

        setMessage("Fotoğraf offline kuyruğa alındı. Bağlantı gelince otomatik yüklenecek.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Oturum bulunamadı.");
        return;
      }

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const storagePath = `services/${serviceId}/${photoType}-${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("service-photos")
        .upload(storagePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const { data: insertedPhoto, error: insertError } = await supabase
        .from("service_photos")
        .insert({
          service_id: serviceId,
          photo_type: photoType,
          storage_path: storagePath,
          uploaded_by: user.id,
          taken_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !insertedPhoto) {
        setMessage(insertError?.message ?? "Fotoğraf kaydı oluşturulamadı.");
        return;
      }

      await supabase.from("service_photo_inspections").upsert(
        {
          organization_id: organizationId,
          service_id: serviceId,
          photo_id: insertedPhoto.id,
          photo_type: photoType,
          requested_by: user.id,
          status: "pending",
        },
        { onConflict: "photo_id" },
      );

      const now = new Date().toISOString();
      if (photoType === "end" && serviceStatus === "in_progress") {
        const { error: updateError } = await supabase
          .from("services")
          .update({ status: "completed", completed_at: now })
          .eq("id", serviceId);

        if (updateError) {
          setMessage(updateError.message);
          return;
        }
      }

      router.refresh();
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex gap-2">
          <input
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
              event.target.value = "";
            }}
            ref={cameraInputRef}
            type="file"
          />
          {galleryEnabled ? (
            <input
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.target.value = "";
              }}
              ref={galleryInputRef}
              type="file"
            />
          ) : null}
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white transition active:scale-95 hover:bg-accent-strong disabled:opacity-60"
            disabled={isUploading || Boolean(disabledReason)}
            onClick={() => cameraInputRef.current?.click()}
            type="button"
          >
            {isUploading ? (
              <Loader2 className="animate-spin" size={15} aria-hidden="true" />
            ) : (
              <Camera size={15} aria-hidden="true" />
            )}
            Kamera
          </button>
          {galleryEnabled ? (
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-panel px-3 text-sm font-medium transition active:scale-95 hover:border-accent/40 hover:text-accent disabled:opacity-60"
              disabled={isUploading || Boolean(disabledReason)}
              onClick={() => galleryInputRef.current?.click()}
              type="button"
            >
              {isUploading ? (
                <Loader2 className="animate-spin" size={15} aria-hidden="true" />
              ) : (
                <ImageIcon size={15} aria-hidden="true" />
              )}
              Galeri
            </button>
          ) : null}
        </div>
      </div>

      {disabledReason ? <p className="mt-2 text-sm text-foreground/50">{disabledReason}</p> : null}
      {message ? <p className="mt-2 text-sm text-danger">{message}</p> : null}
    </div>
  );
}
