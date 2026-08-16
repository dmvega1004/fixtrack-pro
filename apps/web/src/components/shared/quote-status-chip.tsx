import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/api/quotes";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
};

export const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  DRAFT: "bg-neutral-100 text-neutral-800",
  SENT: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

interface QuoteStatusChipProps {
  status: QuoteStatus;
  /** SENT cuya validUntil ya pasó — se distingue visualmente aunque el estado guardado siga siendo SENT. */
  isExpired?: boolean;
}

export function QuoteStatusChip({ status, isExpired }: QuoteStatusChipProps) {
  if (status === "SENT" && isExpired) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        Vencida
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        QUOTE_STATUS_STYLES[status],
      )}
    >
      {QUOTE_STATUS_LABELS[status]}
    </span>
  );
}
