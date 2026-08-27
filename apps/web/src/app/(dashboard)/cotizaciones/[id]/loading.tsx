import { Skeleton } from "@/components/ui/skeleton";

export default function CotizacionDetalleLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-7 w-32 md:h-8" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>

        <div className="flex flex-wrap gap-6">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>

        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-40 w-full rounded-lg lg:col-span-2" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>

      <Skeleton className="h-48 w-full rounded-lg" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}
