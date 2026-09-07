import { getSession } from "@/lib/session";
import { OrderDetailOfflineByPath } from "@/components/work-orders/offline-detail/order-detail-offline-by-path";

/**
 * Pantalla de repuesto de la Etapa 2-D — nadie la visita a propósito
 * (ningún enlace de la app apunta acá) ni recibe un id por parámetro de
 * ruta. Su único trabajo real es dejarse precachear ENTERA por el service
 * worker (ver SHELL_URLS en apps/web/public/sw.js) para que, cuando
 * /ordenes/<id> caiga sin red y sin nada propio en caché, el service
 * worker pueda servir ESTE HTML como respuesta — en la misma dirección de
 * la orden, nunca en esta. El id real se lee ahí, del lado del cliente,
 * de la URL que quedó en la barra (ver OrderDetailOfflineByPath).
 *
 * Server component solo para llegar a la sesión (userId/canManage/isAdmin)
 * — igual que /ordenes/[id]/page.tsx. La capa (dashboard)/layout.tsx ya
 * redirige a /login si no hay sesión válida; el `!session` de acá es
 * defensivo, nunca el camino real.
 */
export default async function DetalleOfflinePage() {
  const session = await getSession();
  if (!session) return null;

  const canManage = session.role === "ADMIN" || session.role === "COORDINATOR";
  const isAdmin = session.role === "ADMIN";

  return (
    <OrderDetailOfflineByPath
      userId={session.userId}
      canManage={canManage}
      isAdmin={isAdmin}
    />
  );
}
