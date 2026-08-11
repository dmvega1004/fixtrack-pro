/** Mismo estilo que formatOrderNumber (OT-0004): "N.º 0007". */
export function formatCollectionNumber(n: number): string {
  return `N.º ${String(n).padStart(4, "0")}`;
}
