import { NextResponse } from "next/server";
import type { OrderStatus } from "@/components/shared/status-chip";
import { getSession } from "@/lib/session";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getPhotos } from "@/lib/api/attachments";
import { getWorkOrderParts } from "@/lib/api/work-order-parts";
import { HttpError } from "@/lib/api/http";
import { SYNC_PAYLOAD_VERSION } from "@/lib/sync/payload-version";
import type { SyncPayload, SyncWorkOrder } from "@/lib/sync/types";

/**
 * Igual que TERMINAL_STATUSES en ordenes/[id]/page.tsx, invertido: el
 * conjunto de trabajo es lo que queda por atender, no el historial de la
 * empresa. DELIVERED/CANCELLED quedan afuera a propósito.
 */
const NON_TERMINAL_STATUSES: OrderStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

/**
 * Tope del payload de sincronización — no es un límite técnico del
 * backend (que sigue paginando con take/skip como siempre), es acotar
 * "lo que hay que atender ahora" y no el histórico completo. Un técnico
 * real no trae más de unas pocas decenas de órdenes activas a la vez;
 * para ADMIN/COORDINATOR (que ven TODAS las de la empresa) actúa como
 * techo del tamaño del payload, priorizando lo actualizado más
 * recientemente si hay más candidatas que el tope.
 *
 * Se piden hasta este número POR CADA estado no terminal (para que un
 * estado con mucho volumen no le quite cupo a otro) y recién ahí se
 * combina, se ordena y se recorta al total — ver GET() más abajo.
 */
const MAX_SYNC_ORDERS = 50;

/**
 * GET /api/sincronizacion — el conjunto de trabajo pendiente del usuario
 * autenticado, en una sola petición. Es el camino de datos para la
 * Etapa 1-C (guardar en el celular); esta entrega no guarda nada ni
 * toca ninguna pantalla.
 *
 * CANDADOS:
 * - Reutiliza EXACTAMENTE las mismas funciones de lib/api que usan las
 *   páginas de hoy (getWorkOrders/getPhotos/getWorkOrderParts). Nunca
 *   toca Prisma ni decide qué campos redactar — el aislamiento por
 *   companyId y la redacción financiera por rol viven en NestJS y ese
 *   sigue siendo el único camino. Lo que el backend omite para este rol
 *   (ver los campos opcionales de WorkOrder/WorkOrderPartsSummary)
 *   llega omitido acá también, sin que este handler tenga que saber
 *   cuáles son.
 * - El token sale de la cookie httpOnly leída del lado del servidor
 *   (getSession/serverFetch) — nunca se expone al navegador.
 * - No acepta ningún identificador de usuario/empresa desde el cliente:
 *   ni query params, ni body (ni siquiera los admite, es un GET). El
 *   usuario sale de la cookie y de nada más.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  try {
    const ordersByStatus = await Promise.all(
      NON_TERMINAL_STATUSES.map((status) =>
        getWorkOrders({ status, take: MAX_SYNC_ORDERS }),
      ),
    );

    const baseOrders = ordersByStatus
      .flat()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_SYNC_ORDERS);

    const orders: SyncWorkOrder[] = await Promise.all(
      baseOrders.map(async (order) => {
        const [photos, parts] = await Promise.all([
          getPhotos(order.id),
          getWorkOrderParts(order.id),
        ]);
        return { ...order, photos, parts };
      }),
    );

    const body: SyncPayload = {
      syncedAt: new Date().toISOString(),
      payloadVersion: SYNC_PAYLOAD_VERSION,
      orders,
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Cookie presente pero el backend la rechazó (token vencido entre que
    // cargó la página y esta llamada): mismo caso que "sin sesión válida".
    if (error instanceof HttpError && error.status === 401) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }
    throw error;
  }
}
