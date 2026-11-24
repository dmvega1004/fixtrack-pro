"use client";

import type { ActionResult } from "@/app/(dashboard)/ordenes/[id]/actions";
import {
  getSnapshot as isConnectivityOffline,
  reportRequestFailure,
  reportRequestSuccess,
} from "../connectivity/store";
import { listOperations } from "./storage";

/**
 * Guardado de los cinco campos de la orden (cuatro textos + estado) cuando
 * la app CREE que hay señal.
 *
 * El problema que cierra (en producción hasta este arreglo): con señal
 * supuesta, los editores llamaban la Server Action directo y sin
 * try/catch. Si la petición fallaba por red —modo avión antes de que el
 * latido lo notara, señal débil— la promesa se rechazaba, el botón se
 * quedaba en «Guardando...» para siempre y el cambio NO quedaba en
 * ningún lado: si el técnico salía de la pantalla, lo perdía.
 *
 * Ahora:
 *  - Sin señal confirmada → a la cola, igual que antes.
 *  - Si un guardado directo anterior sigue colgado (ver hungDirectSaves)
 *    → a la cola.
 *  - Si esta orden ya tiene cambios esperando en la cola → también a la
 *    cola. Si no, el guardado directo llegaría ANTES que esos cambios más
 *    viejos y la cola lo pisaría después con el valor anterior.
 *  - Si no, Server Action directa con tiempo límite. Respuesta del
 *    servidor (bien o rechazo de negocio) → se devuelve tal cual, igual
 *    que hoy. Fallo de red o tiempo agotado → a la cola, y cuenta como
 *    observación para la detección de conexión.
 *
 * Reenviar por la cola algo que el servidor sí alcanzó a aplicar (la
 * respuesta se perdió en el camino) es inofensivo: escribe el mismo
 * valor, y pasar a Completada una orden que ya lo está no vuelve a
 * congelar el cobro (WorkOrdersService.update solo lo hace en la
 * transición).
 */

/**
 * Sin esto, con señal débil una Server Action colgada deja el botón en
 * «Guardando...» lo que tarde el sistema en rendirse (minutos). 20 s
 * cubre de sobra una respuesta lenta en datos móviles.
 */
export const DIRECT_SAVE_TIMEOUT_MS = 20_000;

export interface SaveOutcome extends ActionResult {
  /** true si quedó en la cola del celular en vez de llegar al servidor. */
  queued?: boolean;
}

class DirectSaveTimeoutError extends Error {
  constructor() {
    super(`sin respuesta del servidor en ${DIRECT_SAVE_TIMEOUT_MS / 1000}s`);
  }
}

/**
 * Guardados directos que agotaron el tiempo y todavía no terminan.
 * Next.js ejecuta las Server Actions UNA A LA VEZ: mientras una siga
 * colgada, la siguiente ni siquiera sale — esperaría sus propios 20 s y
 * un rechazo de negocio llegaría tarde, por la cola. Mientras haya una
 * así, todo va directo a la cola (que usa fetch normal, sin esa fila).
 */
let hungDirectSaves = 0;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      hungDirectSaves += 1;
      const release = () => {
        hungDirectSaves -= 1;
      };
      promise.then(release, release);
      reject(new DirectSaveTimeoutError());
    }, DIRECT_SAVE_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Operaciones de esta orden que todavía van a subir (las apartadas no suben solas). */
async function hasWaitingOperations(userId: string, orderId: string): Promise<boolean> {
  try {
    const ops = await listOperations(userId);
    return ops.some((op) => op.orderId === orderId && !op.parked);
  } catch (error) {
    // Sin poder leer la cola, lo seguro es no adelantarse a ella.
    console.error("[cola] no se pudo leer la cola antes de guardar — se encola", error);
    return true;
  }
}

/**
 * `fetch` rechaza con TypeError cuando no hubo respuesta (sin red, DNS,
 * conexión cortada). Cualquier otro error de una Server Action es que el
 * servidor sí contestó, con un fallo (5xx): no dice nada de la señal.
 */
function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || error instanceof DirectSaveTimeoutError;
}

export async function saveDirectOrEnqueue({
  userId,
  orderId,
  direct,
  enqueue,
}: {
  userId: string;
  orderId: string;
  direct: () => Promise<ActionResult>;
  enqueue: () => Promise<unknown>;
}): Promise<SaveOutcome> {
  if (
    isConnectivityOffline() ||
    hungDirectSaves > 0 ||
    (await hasWaitingOperations(userId, orderId))
  ) {
    await enqueue();
    return { ok: true, queued: true };
  }

  try {
    const result = await withTimeout(direct());
    reportRequestSuccess();
    return result;
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn("[cola] guardado directo sin respuesta por red — se guarda en la cola", error);
      reportRequestFailure();
    } else {
      console.error("[cola] el servidor falló al guardar — se guarda en la cola para reintentar", error);
    }
    await enqueue();
    return { ok: true, queued: true };
  }
}
