import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function MemberNewServiceLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <FormSkeleton />
    </>
  );
}
