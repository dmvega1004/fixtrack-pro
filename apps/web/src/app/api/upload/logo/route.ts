import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface BackendErrorBody {
  message?: string | string[];
}

/**
 * Reenvía el multipart al backend con el Bearer de la cookie httpOnly.
 * El backend valida que el rol sea ADMIN (403 si no) — acá no se repite
 * esa validación, solo se retransmite la respuesta tal cual.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();

  const response = await fetch(`${BACKEND_URL}/company/logo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = (data ?? {}) as BackendErrorBody;
    const rawMessage = errorBody.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join("; ")
      : (rawMessage ?? "No se pudo subir el logo");

    return NextResponse.json({ message }, { status: response.status });
  }

  return NextResponse.json(data, { status: response.status });
}
