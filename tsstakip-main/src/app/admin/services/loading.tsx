import { CardSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function AdminServicesLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
