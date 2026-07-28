import { cn } from "@/lib/utils";

// Debe reflejar exactamente el enum OrderStatus de packages/database/prisma/schema.prisma
export type OrderStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En reparación",
  COMPLETED: "Completada",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  DELIVERED: "bg-indigo-100 text-indigo-800",
  CANCELLED: "bg-red-100 text-red-800",
};

interface StatusChipProps {
  status: OrderStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        ORDER_STATUS_STYLES[status],
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
