import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/api/work-orders";

/**
 * Con el prefijo "Pago" adelante (salvo el último, que ya es inequívoco):
 * este chip suele mostrarse junto al StatusChip del trabajo, y ambos pueden
 * decir "Pendiente" — sin el prefijo no hay forma de saber cuál es cuál.
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pago pendiente",
  PARTIAL: "Pago abonado",
  PAID: "Pagado",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-red-100 text-red-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
};

interface PaymentStatusChipProps {
  status: PaymentStatus;
}

export function PaymentStatusChip({ status }: PaymentStatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        PAYMENT_STATUS_STYLES[status],
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
