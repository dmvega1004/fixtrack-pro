import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { apiFetch, HttpError } from "@/lib/api/http";

async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * GET /api/equipos/:id/archivos/:fileId — 302 a la URL de Supabase firmada
 * y de vigencia corta que emite el backend. El archivo se descarga DIRECTO
 * desde Supabase: la URL firmada solo viaja en la cabecera Location de esta
 * respuesta (nunca en JS del cliente) y el navegador la sigue como una
 * navegación normal. Un `<a href>` corriente funciona.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params;
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  try {
    const { url } = await apiFetch<{ url: string }>(
      `/equipments/${id}/files/${fileId}/download`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return NextResponse.redirect(url, 302);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(error.body ?? { message: error.message }, {
        status: error.status,
      });
    }
    console.error("No se pudo obtener el enlace de descarga del archivo:", error);
    return NextResponse.json(
      { message: "No se pudo contactar al servidor. Intenta de nuevo." },
      { status: 502 },
    );
  }
}

/** DELETE /api/equipos/:id/archivos/:fileId — borra el archivo (solo ADMIN). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params;
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  try {
    const deleted = await apiFetch(`/equipments/${id}/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(deleted);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(error.body ?? { message: error.message }, {
        status: error.status,
      });
    }
    console.error("No se pudo borrar el archivo del equipo:", error);
    return NextResponse.json(
      { message: "No se pudo contactar al servidor. Intenta de nuevo." },
      { status: 502 },
    );
  }
}
