import { OrderStatus, Priority } from 'database';

/**
 * Etiquetas en español para formatear valores legibles en la bitácora.
 * Deben reflejar exactamente ORDER_STATUS_LABELS/PRIORITY_LABELS de
 * apps/web/src/components/shared/status-chip.tsx y priority-badge.tsx —
 * el backend no puede importar del frontend, así que se duplican acá.
 */
export const ACTIVITY_ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En reparación',
  COMPLETED: 'Completada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
};

export const ACTIVITY_PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};
