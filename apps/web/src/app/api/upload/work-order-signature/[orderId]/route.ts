import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface BackendErrorBody {
  message?: string | string[];
}

/**
 * Reenvía el multipart al backend con el Bearer de la cookie httpOnly —
 * mismo patrón que /api/upload/photos/[orderId], hacia
 * POST /work-orders/:orderId/signatures/upload: sube UNA rúbrica (la
 * ad-hoc del técnico, o la de quien recibe) y devuelve su URL, sin tocar
 * la orden todavía — eso lo hace saveSignaturesAction por separado,
 * cuando los dos lados están listos.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("No se pudo leer el archivo recibido:", error);
    return NextResponse.json(
      { message: "El archivo llegó incompleto. Intenta firmar de nuevo." },
      { status: 413 },
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `${BACKEND_URL}/work-orders/${orderId}/signatures/upload`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );
  } catch (error) {
    console.error("No se pudo contactar al backend para subir la firma:", error);
    return NextResponse.json(
      { message: "No se pudo contactar al servidor. Verifica tu conexión e intenta de nuevo." },
      { status: 502 },
    );
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = (data ?? {}) as BackendErrorBody;
    const rawMessage = errorBody.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join("; ")
      : (rawMessage ?? "No se pudo subir la firma");

    return NextResponse.json({ message }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
