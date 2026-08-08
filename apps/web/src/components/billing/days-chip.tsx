import { cn } from "@/lib/utils";
import { receivableTone, type ReceivableTone } from "@/lib/format/receivable-status";

const TONE_STYLES: Record<ReceivableTone, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};

interface DaysChipProps {
  daysSinceBilled: number;
  paymentTermDays: number;
  isOverdue: boolean;
}

/** Semáforo de una cuenta por cobrar abierta (PENDING/PARTIAL) — no usar en órdenes pagadas. */
export function DaysChip({ daysSinceBilled, paymentTermDays, isOverdue }: DaysChipProps) {
  const tone = receivableTone(isOverdue, daysSinceBilled, paymentTermDays);
  const label = isOverdue
    ? `Vencida hace ${daysSinceBilled - paymentTermDays} días`
    : `${daysSinceBilled} días · vence en ${paymentTermDays - daysSinceBilled}`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
      )}
    >
      {label}
    </span>
  );
}
