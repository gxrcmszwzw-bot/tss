"use client";

import { Loader2, Mic, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { enqueueOfflineEntry, storeOfflineAsset } from "@/lib/offline-queue";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type VoiceNoteUploadFieldProps = {
  serviceId: string;
  inputName?: string;
};

export function VoiceNoteUploadField({
  serviceId,
  inputName = "storage_path",
}: VoiceNoteUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [storagePath, setStoragePath] = useState("");
  const [fileName, setFileName] = useState("");
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
          file.type || "audio/webm",
        );
        enqueueOfflineEntry({
          kind: "service_voice_note_upload",
          assetId,
          payload: {
            service_id: serviceId,
          },
        });

        setFileName(file.name);
        setStoragePath("");
        setMessage("Ses notu offline kuyruğa alındı. Bağlantı gelince otomatik yüklenecek.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const ext = (file.name.split(".").pop() || "webm").toLowerCase();
      const safeExt = ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"].includes(ext)
        ? ext
        : "webm";
      const nextStoragePath = `voice-notes/${serviceId}/voice-note-${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("service-voice-notes")
        .upload(nextStoragePath, file, {
          contentType: file.type || "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      setStoragePath(nextStoragePath);
      setFileName(file.name);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <input name={inputName} type="hidden" value={storagePath} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Ses Notu</p>
          <p className="text-xs text-foreground/55">Teknisyenin ses kaydini yukleyin.</p>
        </div>
        <input
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-panel px-3 text-sm font-medium transition active:scale-95 hover:border-accent/40 hover:text-accent disabled:opacity-60"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {isUploading ? (
            <Loader2 className="animate-spin" size={15} aria-hidden="true" />
          ) : (
            <Upload size={15} aria-hidden="true" />
          )}
          Dosya Yukle
        </button>
      </div>
      {fileName ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-foreground/70">
          <Mic size={15} aria-hidden="true" />
          <span>{fileName}</span>
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm text-danger">{message}</p> : null}
    </div>
  );
}
