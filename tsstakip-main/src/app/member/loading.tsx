import { GroupSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function MemberLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <GroupSkeleton count={2} />
        <GroupSkeleton count={1} />
      </div>
    </>
  );
}
