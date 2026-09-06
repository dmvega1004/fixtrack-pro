import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

interface DebugBody {
  scenario?: "ok" | "servidor" | "conflicto" | "invalida" | "permiso" | "inexistente" | "sesion-vencida";
  vecesAntes?: number;
  intentoDebug?: number;
}

/**
 * Endpoint de prueba para el motor de la cola de cambios pendientes
 * (Etapa 2-B, ver lib/queue/debug.ts) — no toca Prisma ni ninguna orden
 * real, solo devuelve el código HTTP que pide `scenario`. Existe
 * exclusivamente para poder ejercitar la clasificación de errores del
 * motor (409/400/403/404/401/5xx) desde la consola sin depender de
 * ningún endpoint de escritura real (eso es la Etapa 2-C).
 *
 * Sin estado en el servidor a propósito: las funciones serverless de
 * Vercel no garantizan la misma instancia entre invocaciones (ver el
 * comentario del mismo tema en api/upload/photos/[orderId]/route.ts), así
 * que no se puede "recordar" cuántas veces se llamó con una llave dada
 * en memoria. En su lugar, el cliente manda su propio contador
 * (`intentoDebug`, ver lib/queue/debug.ts) y este endpoint decide en
 * base a eso — determinístico, sin estado.
 *
 * Candado de entorno (mismo criterio que ALLOW_DEBUG_HOOKS en
 * queue-engine-register.tsx, que es lo único que hoy llama a este
 * endpoint): sin él, cualquier usuario autenticado en producción podría
 * mandarle peticiones arbitrarias desde la consola del navegador. 404 y no
 * 403: no hay nada que insinuarle a quien lo intente sobre que este
 * endpoint existe.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "No encontrado" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as DebugBody;

  // Se resuelve ANTES de exigir sesión: el punto es simular que el
  // backend real devolvió 401 (sesión vencida a mitad de jornada), no
  // proteger este endpoint de depuración en sí.
  if (body.scenario === "sesion-vencida") {
    return NextResponse.json({ message: "No autenticado (simulado)" }, { status: 401 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const intento = body.intentoDebug ?? 1;
  const vecesAntes = body.vecesAntes ?? 2;

  switch (body.scenario) {
    case "servidor":
      if (intento <= vecesAntes) {
        return NextResponse.json({ message: `Error de servidor simulado (intento ${intento}/${vecesAntes})` }, { status: 500 });
      }
      return NextResponse.json({ ok: true, intento });

    case "conflicto":
      if (intento <= vecesAntes) {
        // idempotencyKeyConflict: true — simula el 409 de la RESERVA de
        // idempotencia (ver IdempotencyInterceptor), el único que el motor
        // reintenta. Sin este campo el motor lo trataría como un 409 de
        // negocio y lo apartaría de inmediato (ver engine.ts).
        return NextResponse.json(
          {
            message: `Esta operación con la misma llave ya se está procesando (simulado, intento ${intento}/${vecesAntes})`,
            idempotencyKeyConflict: true,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: true, intento });

    case "invalida":
      return NextResponse.json({ message: "Datos inválidos (simulado)" }, { status: 400 });

    case "permiso":
      return NextResponse.json({ message: "Sin permiso (simulado)" }, { status: 403 });

    case "inexistente":
      return NextResponse.json({ message: "No encontrado (simulado)" }, { status: 404 });

    case "ok":
    default:
      return NextResponse.json({ ok: true, intento });
  }
}
