import { Skeleton } from "@/components/ui/skeleton";

export default function EquipoDetalleLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-40 w-full rounded-lg lg:col-span-2" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>

      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
