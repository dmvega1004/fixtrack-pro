export function formatOrderNumber(n: number): string {
  return `OT-${String(n).padStart(4, "0")}`;
}
