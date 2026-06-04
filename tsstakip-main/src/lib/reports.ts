export type Period = "today" | "week" | "month" | "year" | "all" | "custom";

export type DateRange = {
  from: Date | null;
  to: Date | null;
  label: string;
};

export function resolvePeriod(
  period: string | undefined,
  fromParam?: string,
  toParam?: string,
): { period: Period; range: DateRange } {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  switch (period) {
    case "today":
      return {
        period: "today",
        range: { from: startOfDay(now), to: endOfDay(now), label: "Bugün" },
      };
    case "week": {
      const day = now.getDay();
      // Monday as first day of week
      const offset = day === 0 ? 6 : day - 1;
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - offset);
      return {
        period: "week",
        range: { from: start, to: endOfDay(now), label: "Bu Hafta" },
      };
    }
    case "month": {
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      return {
        period: "month",
        range: { from: start, to: endOfDay(now), label: "Bu Ay" },
      };
    }
    case "year": {
      const start = startOfDay(new Date(now.getFullYear(), 0, 1));
      return {
        period: "year",
        range: { from: start, to: endOfDay(now), label: "Bu Yıl" },
      };
    }
    case "custom": {
      const from = fromParam ? startOfDay(new Date(fromParam)) : null;
      const to = toParam ? endOfDay(new Date(toParam)) : null;
      return {
        period: "custom",
        range: {
          from,
          to,
          label:
            from && to
              ? `${from.toLocaleDateString("tr-TR")} – ${to.toLocaleDateString("tr-TR")}`
              : "Özel Aralık",
        },
      };
    }
    default:
      return {
        period: "all",
        range: { from: null, to: null, label: "Tüm Zamanlar" },
      };
  }
}

export function inRange(dateString: string | null, range: DateRange) {
  if (!dateString) return false;
  if (!range.from && !range.to) return true;
  const d = new Date(dateString);
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

export function tallyBy<T>(items: T[], pick: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = pick(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function monthLabel(date: Date) {
  return date.toLocaleString("tr-TR", { year: "numeric", month: "long" });
}
