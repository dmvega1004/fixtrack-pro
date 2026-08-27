import { Skeleton } from "@/components/ui/skeleton";

export default function ClienteDetalleLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <Skeleton className="h-36 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}
