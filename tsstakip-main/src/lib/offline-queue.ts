"use client";

export const OFFLINE_QUEUE_STORAGE_KEY = "tss-offline-queue-v2";
const OFFLINE_ASSET_DB = "tss-offline-assets";
const OFFLINE_ASSET_STORE = "files";

export type OfflineQueueKind =
  | "service_create"
  | "service_photo_upload"
  | "service_invoice_upload"
  | "service_voice_note_upload";

export type OfflineQueueEntry = {
  id: string;
  kind: OfflineQueueKind;
  createdAt: string;
  retryCount: number;
  payload: Record<string, string>;
  assetId?: string | null;
  nextAttemptAt?: string | null;
  lastError?: string | null;
};

type OfflineAssetRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  createdAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseIndexedDb() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function emitQueueChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tss-offline-queue-changed"));
}

function createEntryId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildConflictKey(input: {
  kind: OfflineQueueKind;
  payload: Record<string, string>;
}) {
  switch (input.kind) {
    case "service_create":
      return [
        input.kind,
        input.payload.site_id ?? "",
        input.payload.customer_phone ?? "",
        input.payload.scheduled_at ?? "",
      ].join(":");
    case "service_photo_upload":
      return [
        input.kind,
        input.payload.service_id ?? "",
        input.payload.photo_type ?? "",
      ].join(":");
    case "service_invoice_upload":
      return [
        input.kind,
        input.payload.service_id ?? "",
        input.payload.invoice_number ?? "",
        input.payload.invoice_amount ?? "",
      ].join(":");
    case "service_voice_note_upload":
      return [input.kind, input.payload.service_id ?? ""].join(":");
    default:
      return `${input.kind}:${Date.now()}`;
  }
}

function entryConflictKey(entry: OfflineQueueEntry) {
  return buildConflictKey({ kind: entry.kind, payload: entry.payload });
}

function openAssetDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("IndexedDB desteklenmiyor."));
      return;
    }

    const request = window.indexedDB.open(OFFLINE_ASSET_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_ASSET_STORE)) {
        db.createObjectStore(OFFLINE_ASSET_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline asset DB acilamadi."));
  });
}

async function withAssetStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  const db = await openAssetDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_ASSET_STORE, mode);
    const store = tx.objectStore(OFFLINE_ASSET_STORE);
    const request = handler(store);

    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Offline asset islemi basarisiz."));
    } else {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error ?? new Error("Offline asset transaction basarisiz."));
    }

    tx.oncomplete = () => {
      db.close();
      if (!request) resolve(undefined);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Offline asset transaction basarisiz."));
    };
  });
}

export function readOfflineQueue() {
  if (!canUseStorage()) return [] as OfflineQueueEntry[];

  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineQueueEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOfflineQueue(entries: OfflineQueueEntry[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(entries));
  emitQueueChanged();
}

export async function storeOfflineAsset(file: File | Blob, fileName: string, mimeType: string) {
  const id = createEntryId();
  const record: OfflineAssetRecord = {
    id,
    fileName,
    mimeType,
    blob: file,
    createdAt: new Date().toISOString(),
  };
  await withAssetStore("readwrite", (store) => store.put(record));
  return id;
}

export async function readOfflineAsset(assetId: string) {
  const result = await withAssetStore<OfflineAssetRecord | undefined>("readonly", (store) =>
    store.get(assetId),
  );
  return result ?? null;
}

export async function removeOfflineAsset(assetId: string) {
  await withAssetStore("readwrite", (store) => {
    store.delete(assetId);
  });
}

export async function readOfflineAssetAsPayload(assetId: string) {
  const record = await readOfflineAsset(assetId);
  if (!record) return null;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Offline asset okunamadi."));
    reader.readAsDataURL(record.blob);
  });

  return {
    fileName: record.fileName,
    mimeType: record.mimeType,
    dataUrl,
  };
}

export function enqueueOfflineEntry(input: {
  kind: OfflineQueueKind;
  payload: Record<string, string>;
  assetId?: string | null;
}) {
  const entries = readOfflineQueue();
  const conflictKey = buildConflictKey(input);
  const existing = entries.find((entry) => entryConflictKey(entry) === conflictKey);
  const nextEntry: OfflineQueueEntry = {
    id: existing?.id ?? createEntryId(),
    kind: input.kind,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    retryCount: 0,
    payload: input.payload,
    assetId: input.assetId ?? null,
    nextAttemptAt: null,
    lastError: null,
  };
  if (existing?.assetId && existing.assetId !== nextEntry.assetId) {
    void removeOfflineAsset(existing.assetId);
  }
  writeOfflineQueue(
    existing
      ? entries.map((entry) => (entry.id === existing.id ? nextEntry : entry))
      : [...entries, nextEntry],
  );
  return nextEntry;
}

export async function removeOfflineEntry(entry: OfflineQueueEntry | string) {
  const entryId = typeof entry === "string" ? entry : entry.id;
  const current = typeof entry === "string" ? readOfflineQueue().find((item) => item.id === entryId) : entry;
  writeOfflineQueue(readOfflineQueue().filter((item) => item.id !== entryId));
  if (current?.assetId) {
    await removeOfflineAsset(current.assetId);
  }
}

export function updateOfflineEntry(
  entryId: string,
  updater: (entry: OfflineQueueEntry) => OfflineQueueEntry,
) {
  writeOfflineQueue(
    readOfflineQueue().map((entry) => (entry.id === entryId ? updater(entry) : entry)),
  );
}
