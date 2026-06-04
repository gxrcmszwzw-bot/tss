import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function MembersLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl bg-panel p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
          <Skeleton className="mb-4 h-5 w-32" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton className="h-11 w-full" key={i} />
            ))}
          </div>
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div className="rounded-xl bg-panel p-4" key={i} style={{ boxShadow: "var(--shadow-sm)" }}>
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
