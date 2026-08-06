import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface BackendErrorBody {
  message?: string | string[];
}

/**
 * Reenvía el multipart tal cual al backend NestJS, con el Bearer sacado de
 * la cookie httpOnly (el cliente nunca ve el token). Route Handler en vez
 * de Server Action: las Server Actions de Next tienen un límite de tamaño
 * de body pensado para payloads pequeños, poco adecuado para fotos.
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

  // request.formData() puede fallar si el body llegó truncado (ej. supera
  // el límite de tamaño de las funciones serverless de Vercel, ~4.5MB) —
  // sin este try/catch, la excepción sin capturar produce el genérico
  // "Internal Server Error" de Next en vez de un mensaje accionable. La
  // compresión del lado del cliente (ver PhotosTab) evita este caso en la
  // gran mayoría de subidas, pero el fallback queda como red de seguridad.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("No se pudo leer el archivo recibido:", error);
    return NextResponse.json(
      { message: "El archivo es demasiado grande o llegó incompleto. Intenta con una foto más liviana." },
      { status: 413 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/work-orders/${orderId}/photos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch (error) {
    console.error("No se pudo contactar al backend para subir la foto:", error);
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
      : (rawMessage ?? "No se pudo subir la foto");

    return NextResponse.json({ message }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
