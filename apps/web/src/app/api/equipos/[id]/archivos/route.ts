import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { apiFetch, HttpError } from "@/lib/api/http";

/**
 * Proxy de la lista y el REGISTRO de archivos de un equipo. Reenvía JSON
 * pequeño al backend con el Bearer de la cookie httpOnly (el token nunca
 * llega al cliente).
 *
 * El archivo en sí NO pasa por acá: el navegador lo sube directo a Supabase
 * con la URL firmada de /archivos/firma. Esta ruta solo mueve metadatos.
 *
 * No usa serverFetch a propósito (mismo criterio que
 * app/api/upload/photos/[orderId]/route.ts): lo llama fetch() desde el
 * navegador, un 401 debe volver tal cual, no redirigir.
 */

const NO_TOKEN = NextResponse.json({ message: "No autenticado" }, { status: 401 });

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

function forwardError(error: unknown, fallback: string): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(error.body ?? { message: error.message }, {
      status: error.status,
    });
  }
  console.error(fallback, error);
  return NextResponse.json(
    { message: "No se pudo contactar al servidor. Intenta de nuevo." },
    { status: 502 },
  );
}

/** GET /api/equipos/:id/archivos — lista los archivos del equipo. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await getToken();
  if (!token) return NO_TOKEN;

  try {
    const files = await apiFetch(`/equipments/${id}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(files);
  } catch (error) {
    return forwardError(error, "No se pudo listar los archivos del equipo:");
  }
}

/** POST /api/equipos/:id/archivos — registra un archivo ya subido a Supabase. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await getToken();
  if (!token) return NO_TOKEN;

  const body: unknown = await request.json().catch(() => null);

  try {
    const file = await apiFetch(`/equipments/${id}/files`, {
      method: "POST",
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    return forwardError(error, "No se pudo registrar el archivo del equipo:");
  }
}
