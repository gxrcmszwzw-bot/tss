"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const presets: { value: string; label: string }[] = [
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
  { value: "year", label: "Bu Yıl" },
  { value: "all", label: "Tümü" },
  { value: "custom", label: "Özel" },
];

export function PeriodFilter({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setPeriod(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("period", value);
    if (value !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function setRange(key: "from" | "to", value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("period", "custom");
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const fromValue = searchParams.get("from") ?? "";
  const toValue = searchParams.get("to") ?? "";

  return (
    <div
      className="rounded-xl bg-panel p-4 transition"
      style={{
        boxShadow: "var(--shadow-sm)",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = current === preset.value;
          return (
            <button
              className={`rounded-lg px-4 py-2 text-sm font-medium transition active:scale-95 ${
                isActive
                  ? "bg-accent text-white shadow-sm"
                  : "border border-border bg-background text-foreground/75 hover:border-accent/40 hover:text-accent"
              }`}
              key={preset.value}
              onClick={() => setPeriod(preset.value)}
              type="button"
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {current === "custom" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/60">Başlangıç</span>
            <input
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              max={toValue || undefined}
              onChange={(event) => setRange("from", event.target.value)}
              type="date"
              value={fromValue}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/60">Bitiş</span>
            <input
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
              min={fromValue || undefined}
              onChange={(event) => setRange("to", event.target.value)}
              type="date"
              value={toValue}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
