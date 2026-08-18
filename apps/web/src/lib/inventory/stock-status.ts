/**
 * Punto de reorden: estar EN el mínimo ya amerita reponer, no solo estar
 * por debajo. Debe coincidir exactamente con el criterio de
 * SparePartsService.findAll en packages/backend/src/spare-parts/spare-parts.service.ts
 * — no hay paquete compartido entre frontend y backend, así que se replica
 * a mano; si cambia uno, cambia el otro.
 */
export function isLowStock(stock: number, minStock: number): boolean {
  return stock <= minStock;
}

/** Los artículos "contra pedido" (trackStock=false) nunca entran en la alerta. */
export function needsRestock(part: {
  trackStock: boolean;
  stock: number;
  minStock: number;
}): boolean {
  return part.trackStock && isLowStock(part.stock, part.minStock);
}
