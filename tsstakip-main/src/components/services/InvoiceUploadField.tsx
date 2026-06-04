"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type InvoiceUploadFieldProps = {
  serviceId: string;
  inputName?: string;
};

export function InvoiceUploadField({
  serviceId,
  inputName = "storage_path",
}: InvoiceUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [storagePath, setStoragePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    setMessage(null);
    setIsUploading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
      const safeExt = ["pdf", "jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "pdf";
      const nextStoragePath = `invoices/${serviceId}/invoice-${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("service-invoices")
        .upload(nextStoragePath, file, {
          contentType: file.type || "application/pdf",
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
          <p className="text-sm font-medium">Fatura Dosyası</p>
          <p className="text-xs text-foreground/55">PDF veya görsel yükleyin.</p>
        </div>
        <input
          accept=".pdf,image/*"
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
          Dosya Yükle
        </button>
      </div>
      {fileName ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-foreground/70">
          <FileText size={15} aria-hidden="true" />
          <span>{fileName}</span>
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm text-danger">{message}</p> : null}
    </div>
  );
}
