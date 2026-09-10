import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { apiFetch, HttpError } from "@/lib/api/http";

/**
 * Paso 1 de la subida: pide al backend una URL firmada para subir el
 * archivo DIRECTO a Supabase. Solo mueve JSON pequeño; el archivo nunca
 * pasa por Next. El Bearer sale de la cookie httpOnly.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);

  try {
    const signed = await apiFetch(`/equipments/${id}/files/signature`, {
      method: "POST",
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(signed);
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(error.body ?? { message: error.message }, {
        status: error.status,
      });
    }
    console.error("No se pudo firmar la subida del archivo:", error);
    return NextResponse.json(
      { message: "No se pudo contactar al servidor. Intenta de nuevo." },
      { status: 502 },
    );
  }
}
