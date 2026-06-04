type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-foreground/8 ${className}`}
      style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-xl bg-panel p-4"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <div className="md:text-right space-y-2">
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="ml-auto h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          className="rounded-xl bg-panel p-5"
          key={i}
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-8 w-12" />
        </div>
      ))}
    </section>
  );
}

export function GroupSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section
      className="overflow-hidden rounded-xl bg-panel"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="space-y-2.5 p-3">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2, 3].map((i) => (
        <div className="rounded-xl border border-border bg-panel p-5" key={i}>
          <Skeleton className="mb-4 h-5 w-32" />
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((j) => (
              <div key={j}>
                <Skeleton className="mb-1.5 h-3 w-20" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Skeleton className="h-12 w-40" />
    </div>
  );
}
