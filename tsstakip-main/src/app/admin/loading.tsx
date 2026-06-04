import { GroupSkeleton, PageHeaderSkeleton, StatsSkeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatsSkeleton />
      <div className="mt-5 space-y-4">
        <GroupSkeleton count={2} />
        <GroupSkeleton count={1} />
      </div>
    </>
  );
}
