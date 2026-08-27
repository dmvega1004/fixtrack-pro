import { Skeleton } from "@/components/ui/skeleton";

const TABS = ["Detalles", "Valores", "Fotos", "Historial"];

export default function OrdenDetalleLoading() {
  return (
    <div className="flex flex-1 flex-col pb-36 md:pb-6">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-7 w-28 md:h-8" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      <Skeleton className="m-4 h-12 w-full rounded-lg md:mx-6" />

      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <div key={tab} className="flex-1 px-4 py-3 md:flex-none md:w-28">
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}
