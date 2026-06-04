import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="overflow-hidden rounded-xl bg-panel" key={i} style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="border-b border-border px-5 py-4">
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-3 p-5">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
