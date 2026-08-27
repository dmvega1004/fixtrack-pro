import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS = 6;
const ROWS = 8;
const CARDS = 5;

export default function CotizacionesLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      <Skeleton className="h-9 w-full max-w-sm rounded-md" />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <div className="flex border-b border-border bg-muted/40 px-4 py-3">
          {Array.from({ length: COLUMNS }).map((_, index) => (
            <Skeleton key={index} className="mr-6 h-3 w-16" />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: ROWS }).map((_, index) => (
            <div key={index} className="flex items-center gap-6 px-4 py-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: CARDS }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
