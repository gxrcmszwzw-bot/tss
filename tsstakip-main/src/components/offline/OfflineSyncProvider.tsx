"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  readOfflineQueue,
  readOfflineAssetAsPayload,
  removeOfflineEntry,
  type OfflineQueueEntry,
  updateOfflineEntry,
} from "@/lib/offline-queue";

type OfflineSyncContextValue = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastMessage: string | null;
  nextRetryAt: string | null;
  syncNow: () => Promise<void>;
  refreshQueue: () => void;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

async function syncEntry(entry: OfflineQueueEntry) {
  const assetPayload = entry.assetId
    ? await readOfflineAssetAsPayload(entry.assetId)
    : null;

  const response = await fetch("/api/offline/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...entry,
      asset: assetPayload,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? "Offline senkronizasyon başarısız.");
  }
}

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pendingCount, setPendingCount] = useState(() => readOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<string | null>(null);

  const refreshQueue = useCallback(() => {
    const queue = readOfflineQueue();
    setPendingCount(queue.length);
    const nextRetry = queue
      .map((entry) => entry.nextAttemptAt)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;
    setNextRetryAt(nextRetry);
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    const queue = readOfflineQueue();
    if (queue.length === 0) {
      setLastMessage("Bekleyen offline kayıt yok.");
      setPendingCount(0);
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    const now = Date.now();

    try {
      for (const entry of queue) {
        if (entry.nextAttemptAt && new Date(entry.nextAttemptAt).getTime() > now) {
          continue;
        }
        try {
          await syncEntry(entry);
          await removeOfflineEntry(entry);
          successCount += 1;
        } catch (error) {
          const nextRetryMs = Math.min(30 * 60 * 1000, Math.max(15_000, 2 ** entry.retryCount * 15_000));
          const nextAttemptAt = new Date(Date.now() + nextRetryMs).toISOString();
          updateOfflineEntry(entry.id, (current) => ({
            ...current,
            retryCount: current.retryCount + 1,
            nextAttemptAt,
            lastError: error instanceof Error ? error.message : String(error),
          }));
          setLastMessage(error instanceof Error ? error.message : String(error));
        }
      }
    } finally {
      setIsSyncing(false);
      const remaining = readOfflineQueue().length;
      setPendingCount(remaining);
      refreshQueue();
      if (successCount > 0) {
        setLastMessage(`${successCount} offline kayıt senkronize edildi.`);
      }
    }
  }, [isSyncing, refreshQueue]);

  useEffect(() => {
    let initialSyncTimeout: number | null = null;
    if (navigator.onLine) {
      initialSyncTimeout = window.setTimeout(() => {
        void syncNow();
      }, 0);
    }

    function handleOnline() {
      setIsOnline(true);
      void syncNow();
    }

    function handleOffline() {
      setIsOnline(false);
      setLastMessage("Çevrimdışı mod aktif. İşlemler kuyruğa alınacak.");
    }

    function handleQueueChanged() {
      refreshQueue();
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("tss-offline-queue-changed", handleQueueChanged);

    return () => {
      if (initialSyncTimeout !== null) {
        window.clearTimeout(initialSyncTimeout);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("tss-offline-queue-changed", handleQueueChanged);
    };
  }, [refreshQueue, syncNow]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingCount,
      isSyncing,
      lastMessage,
      nextRetryAt,
      syncNow,
      refreshQueue,
    }),
    [isOnline, pendingCount, isSyncing, lastMessage, nextRetryAt, syncNow, refreshQueue],
  );

  return (
    <OfflineSyncContext.Provider value={value}>
      {children}
      <OfflineSyncBanner />
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return context;
}

function OfflineSyncBanner() {
  const { isOnline, pendingCount, isSyncing, lastMessage, nextRetryAt, syncNow } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !lastMessage) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[90] w-[min(92vw,560px)] -translate-x-1/2">
      <div className="pointer-events-auto rounded-xl border border-border bg-panel px-4 py-3 shadow-lg">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isOnline ? "Bağlantı aktif" : "Çevrimdışı mod"}
            </p>
            <p className="text-xs text-foreground/60">
              {pendingCount > 0
                ? `${pendingCount} kayıt senkron bekliyor.`
                : lastMessage ?? "Tüm offline kayıtlar senkronize edildi."}
            </p>
            {nextRetryAt ? (
              <p className="mt-1 text-[11px] text-foreground/45">
                Sonraki retry: {new Date(nextRetryAt).toLocaleTimeString("tr-TR")}
              </p>
            ) : null}
          </div>
          {isOnline && pendingCount > 0 ? (
            <button
              className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
              disabled={isSyncing}
              onClick={() => void syncNow()}
              type="button"
            >
              {isSyncing ? "Senkronize ediliyor..." : "Şimdi Senkronize Et"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
