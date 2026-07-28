// Debe reflejar exactamente CURRENCIES en
// packages/backend/src/company/dto/update-company.dto.ts
export const CURRENCIES = ["COP", "USD", "EUR", "MXN", "PEN"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  COP: "Peso colombiano (COP)",
  USD: "Dólar estadounidense (USD)",
  EUR: "Euro (EUR)",
  MXN: "Peso mexicano (MXN)",
  PEN: "Sol peruano (PEN)",
};
