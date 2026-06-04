import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function ReportsLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <Skeleton className="h-20 w-full rounded-xl" />
      <section className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="rounded-xl bg-panel p-4" key={i} style={{ boxShadow: "var(--shadow-sm)" }}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-12" />
          </div>
        ))}
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div className="rounded-xl bg-panel p-5" key={i} style={{ boxShadow: "var(--shadow-sm)" }}>
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="flex items-center gap-4">
              <Skeleton className="size-40 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
