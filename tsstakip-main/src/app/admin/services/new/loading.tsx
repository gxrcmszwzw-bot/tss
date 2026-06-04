import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function NewServiceLoading() {
  return (
    <>
      <PageHeaderSkeleton />
      <FormSkeleton />
    </>
  );
}
