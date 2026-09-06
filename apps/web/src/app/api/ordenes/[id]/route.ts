import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { apiFetch, HttpError } from "@/lib/api/http";

/**
 * PATCH /api/ordenes/:id — único productor real del motor de la cola de
 * cambios pendientes (Etapa 2-C, ver lib/queue/producers.ts): reenvía tal
 * cual a PATCH /work-orders/:id del backend, con la cabecera
 * Idempotency-Key que trae la petición (la pone el motor, ver
 * lib/queue/engine.ts — nunca el productor).
 *
 * No se usa serverFetch (lib/api/server-fetch.ts) a propósito: ese helper
 * redirige a /login o a /api/auth/logout ante un 401, que tiene sentido en
 * una Server Action pero no acá — esto lo llama fetch() directo desde el
 * navegador (offline, sin navegación de por medio), y el motor de la cola
 * necesita recibir el 401 tal cual para detener la pasada sin reintentar
 * en bucle (ver classification en engine.ts). Mismo patrón que
 * app/api/upload/photos/[orderId]/route.ts.
 *
 * El cuerpo de error se reenvía COMPLETO (no solo `message`): un 409 de
 * negocio (orden ya cerrada) y un 409 de reserva de idempotencia comparten
 * status pero se distinguen por el campo `idempotencyKeyConflict` (ver
 * IdempotencyInterceptor) — recortarlo a `message` le quitaría al motor la
 * única forma de diferenciarlos.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  const body: unknown = await request.json().catch(() => null);

  try {
    const order = await apiFetch(`/work-orders/${id}`, {
      method: "PATCH",
      body,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
      },
    });

    revalidatePath(`/ordenes/${id}`);
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(error.body ?? { message: error.message }, {
        status: error.status,
      });
    }

    console.error("No se pudo contactar al backend para actualizar la orden:", error);
    return NextResponse.json(
      { message: "No se pudo contactar al servidor. Intenta de nuevo." },
      { status: 502 },
    );
  }
}
