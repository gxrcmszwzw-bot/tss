"use client";

export const OFFLINE_QUEUE_STORAGE_KEY = "tss-offline-queue-v1";

export type OfflineQueueKind = "service_create";

export type OfflineQueueEntry = {
  id: string;
  kind: OfflineQueueKind;
  createdAt: string;
  retryCount: number;
  payload: Record<string, string>;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitQueueChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tss-offline-queue-changed"));
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

export function enqueueOfflineEntry(input: {
  kind: OfflineQueueKind;
  payload: Record<string, string>;
}) {
  const entries = readOfflineQueue();
  const nextEntry: OfflineQueueEntry = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: input.kind,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    payload: input.payload,
  };
  writeOfflineQueue([...entries, nextEntry]);
  return nextEntry;
}

export function removeOfflineEntry(entryId: string) {
  writeOfflineQueue(readOfflineQueue().filter((entry) => entry.id !== entryId));
}

export function updateOfflineEntry(entryId: string, updater: (entry: OfflineQueueEntry) => OfflineQueueEntry) {
  writeOfflineQueue(
    readOfflineQueue().map((entry) => (entry.id === entryId ? updater(entry) : entry)),
  );
}
