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

  const formData = await request.formData();

  const response = await fetch(
    `${BACKEND_URL}/work-orders/${orderId}/photos`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

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
