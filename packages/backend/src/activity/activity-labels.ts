import { OrderStatus, PaymentMethod, Prisma, Priority } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

/**
 * El backend corre en UTC (Railway); el negocio opera en Colombia. Sin
 * este timeZone explícito, una fecha se formatea con la hora del
 * servidor — visible en la bitácora, ej. una orden facturada a las 8pm
 * hora local ya cayó en el día siguiente en UTC. El día que la
 * plataforma se venda fuera de Colombia esto debe volverse una
 * configuración por empresa; hoy agregar eso sería complejidad sin
 * beneficio (mismo criterio que apps/web/src/lib/format/dates.ts).
 */
const BOGOTA_TIME_ZONE = 'America/Bogota';

/**
 * Etiquetas en español para formatear valores legibles en la bitácora.
 * Deben reflejar exactamente ORDER_STATUS_LABELS/PRIORITY_LABELS/
 * PAYMENT_METHOD_LABELS de apps/web/src/components/shared/status-chip.tsx,
 * priority-badge.tsx y apps/web/src/lib/payment-method.ts — el backend no
 * puede importar del frontend, así que se duplican acá.
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

export const ACTIVITY_PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
  CARD: 'Tarjeta',
  OTHER: 'Otro',
};

/** "Ana Gómez" o, si no tiene nombre cargado, su correo. Mismo autor en todos los eventos de la orden. */
export function activityAuthorName(user: AuthenticatedUser): string {
  return user.name.trim() || user.email;
}

const NON_DIGIT_SEPARATOR = /\s/g;

/**
 * Monto formateado como texto legible (separador de miles, símbolo de
 * moneda), igual que apps/web/src/lib/format/currency.ts pero sin el
 * espacio de no separación que agrega Intl entre el símbolo y la cifra —
 * se retira para que la bitácora lea "$150.000", no "$ 150.000".
 */
export function formatActivityCurrency(
  amount: Prisma.Decimal | number | string,
  currency: string,
): string {
  const numericAmount =
    amount instanceof Prisma.Decimal ? amount.toNumber() : Number(amount);
  const isCOP = currency === 'COP';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: isCOP ? 0 : 2,
    maximumFractionDigits: isCOP ? 0 : 2,
  })
    .format(numericAmount)
    .replace(NON_DIGIT_SEPARATOR, '');
}

/** Fecha en formato local, igual que apps/web/src/lib/format/dates.ts. */
export function formatActivityDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: BOGOTA_TIME_ZONE,
  }).format(date);
}

/** "N.º 0125", igual que apps/web/src/lib/format/collection-number.ts. */
export function formatActivityCollectionNumber(n: number): string {
  return `N.º ${String(n).padStart(4, '0')}`;
}
