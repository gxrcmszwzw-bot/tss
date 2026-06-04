import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function ServiceDetailLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div className="rounded-xl bg-panel p-5" key={i} style={{ boxShadow: "var(--shadow-sm)" }}>
              <Skeleton className="mb-4 h-5 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-panel p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <Skeleton className="mb-5 h-6 w-40" />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton className="h-11 w-full" key={i} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
