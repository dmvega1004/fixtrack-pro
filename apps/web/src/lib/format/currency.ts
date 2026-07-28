export function formatCurrency(
  amount: number | string,
  currency = "COP",
  locale = "es-CO",
): string {
  const numericAmount = typeof amount === "string" ? Number(amount) : amount;
  const isCOP = currency === "COP";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: isCOP ? 0 : 2,
    maximumFractionDigits: isCOP ? 0 : 2,
  }).format(numericAmount);
}
