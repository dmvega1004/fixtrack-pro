"use client";

import { useSyncExternalStore } from "react";
import { OfflineOrderView } from "./offline-order-view";

/**
 * Coincide con /ordenes/<id> exactamente (un solo segmento) — no con
 * /ordenes, /ordenes/nueva ni /ordenes/detalle-offline (esas ya se sirven
 * desde su propia entrada precacheada, nunca llegan hasta acá). Ver el
 * mismo patrón (duplicado a propósito, sin importarlo — este archivo no
 * puede depender de sw.js) en apps/web/public/sw.js.
 */
const ORDER_ID_PATTERN = /^\/ordenes\/([^/]+)$/;

/**
 * `window.location.pathname` no cambia durante la vida de esta pantalla
 * (nunca hay una navegación de cliente que lo actualice — ver
 * offline-safe-link.tsx), así que no hace falta escuchar nada; solo
 * queda un listener sin efecto para cumplir el contrato de
 * useSyncExternalStore.
 */
function subscribe(): () => void {
  return () => {};
}

/** Único punto donde se lee la URL real — ver el porqué en el docblock de abajo. */
function getSnapshot(): string {
  const match = ORDER_ID_PATTERN.exec(window.location.pathname);
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * En el servidor no hay ninguna URL "real" que leer todavía — esta
 * pantalla se sirve genérica, precacheada UNA sola vez (ver sw.js), nunca
 * server-rendered para un id en particular. `null` distingue "todavía no
 * sabemos" de "" ("sabemos que no hay id"), para que OrderDetailOfflineByPath
 * no renderice nada hasta que useSyncExternalStore corrija con el valor
 * real leído del cliente tras hidratar.
 */
function getServerSnapshot(): string | null {
  return null;
}

interface OrderDetailOfflineByPathProps {
  userId: string;
  canManage: boolean;
  isAdmin: boolean;
}

/**
 * Pantalla de repuesto de la Etapa 2-D: el service worker la sirve, TAL
 * CUAL, como respuesta a la navegación real cuando /ordenes/<id> no tiene
 * nada precacheado y no hay red (ver ORDER_DETAIL_PATTERN en sw.js) — la
 * dirección de la barra queda en /ordenes/<id>, nunca en la de esta
 * pantalla. Por eso el id NO llega por parámetro de ruta (Next hidrató el
 * árbol de ESTA página, no el de /ordenes/[id]): se lee directo de
 * `window.location.pathname`, la única fuente que coincide con lo que el
 * técnico ve en la barra.
 *
 * useSyncExternalStore en vez de useState+useEffect: leer window en un
 * efecto y llamar a setState ahí mismo dispara un render en cascada
 * evitable (ver react-hooks/set-state-in-effect) — mismo patrón que
 * useOnlineStatus/useSyncState/useQueueState para el mismo problema
 * general (leer algo que solo existe en el navegador sin romper SSR).
 *
 * Antes de que getSnapshot corra en el cliente (incluida la instancia
 * servida desde HTML precacheado, que arranca sin haber hidratado nada
 * todavía) no se renderiza NADA — nunca un valor por defecto ni el de la
 * última vez que se precacheó esta pantalla. Así se cumple "nunca mostrar
 * los datos de otra orden, ni un instante": no hay ninguna orden que
 * mostrar hasta que se sepa, de la URL real, cuál es.
 */
export function OrderDetailOfflineByPath({
  userId,
  canManage,
  isAdmin,
}: OrderDetailOfflineByPathProps) {
  const orderId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (orderId === null) return null;

  return (
    <OfflineOrderView
      orderId={orderId}
      userId={userId}
      canManage={canManage}
      isAdmin={isAdmin}
    />
  );
}
