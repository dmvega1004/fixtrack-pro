import Link from "next/link";
import { cn } from "@/lib/utils";
import type { QuoteStatusFilter } from "@/lib/api/quotes";

const FILTERS: { key: QuoteStatusFilter; label: string }[] = [
  { key: "DRAFT", label: "Borradores" },
  { key: "SENT", label: "Enviadas" },
  { key: "ACCEPTED", label: "Aceptadas" },
  { key: "REJECTED", label: "Rechazadas" },
  { key: "EXPIRED", label: "Vencidas" },
];

interface QuoteStatusFilterChipsProps {
  currentStatus?: QuoteStatusFilter;
  /** Término de búsqueda activo — se propaga para no perderlo al cambiar de filtro. */
  currentSearch?: string;
}

export function QuoteStatusFilterChips({
  currentStatus,
  currentSearch,
}: QuoteStatusFilterChipsProps) {
  function hrefFor(status?: QuoteStatusFilter): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (currentSearch) params.set("q", currentSearch);
    const query = params.toString();
    return query ? `/cotizaciones?${query}` : "/cotizaciones";
  }

  function chipClasses(active: boolean): string {
    return cn(
      "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:text-foreground",
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={hrefFor(undefined)} className={chipClasses(!currentStatus)}>
        Todas
      </Link>
      {FILTERS.map((filter) => (
        <Link
          key={filter.key}
          href={hrefFor(filter.key)}
          className={chipClasses(currentStatus === filter.key)}
        >
          {filter.label}
        </Link>
      ))}
    </div>
  );
}
