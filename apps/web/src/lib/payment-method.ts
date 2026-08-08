// Debe reflejar exactamente el enum PaymentMethod de packages/database/prisma/schema.prisma
export const PAYMENT_METHODS = ["CASH", "TRANSFER", "CHECK", "CARD", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CARD: "Tarjeta",
  OTHER: "Otro",
};
