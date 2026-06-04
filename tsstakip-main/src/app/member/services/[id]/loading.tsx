import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function MemberServiceDetailLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div className="rounded-xl bg-panel p-5" key={i} style={{ boxShadow: "var(--shadow-sm)" }}>
            <Skeleton className="mb-4 h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
    </>
  );
}
