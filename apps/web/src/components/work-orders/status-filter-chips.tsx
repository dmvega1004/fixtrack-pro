import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/components/shared/status-chip";

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

interface StatusFilterChipsProps {
  currentStatus?: OrderStatus;
  currentPriority?: string;
}

export function StatusFilterChips({
  currentStatus,
  currentPriority,
}: StatusFilterChipsProps) {
  function hrefFor(status?: OrderStatus): string {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (currentPriority) params.set("priority", currentPriority);
    const query = params.toString();
    return query ? `/ordenes?${query}` : "/ordenes";
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
      {STATUSES.map((status) => (
        <Link
          key={status}
          href={hrefFor(status)}
          className={chipClasses(currentStatus === status)}
        >
          {ORDER_STATUS_LABELS[status]}
        </Link>
      ))}
    </div>
  );
}
