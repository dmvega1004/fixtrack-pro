import { NextResponse } from "next/server";
import { login } from "@/lib/api/auth";
import { HttpError } from "@/lib/api/http";
import {
  SESSION_COOKIE_NAME,
  DEVICE_KNOWN_COOKIE_NAME,
  DEVICE_KNOWN_COOKIE_MAX_AGE,
} from "@/lib/session";

const EIGHT_HOURS_IN_SECONDS = 60 * 60 * 8;

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  const body: LoginRequestBody | null = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { message: "Correo y contraseña son requeridos" },
      { status: 400 },
    );
  }

  try {
    const { accessToken, user } = await login(body.email, body.password);

    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: EIGHT_HOURS_IN_SECONDS,
    });

    // Marca de dispositivo conocido (ver DEVICE_KNOWN_COOKIE_NAME en
    // lib/session.ts). Sobrevive al vencimiento de la sesión y hace que la
    // raíz muestre /login —no la landing— a un técnico cuya jornada
    // expiró. proxy.ts la vuelve a sembrar para sesiones abiertas antes de
    // este cambio; acá se escribe fresca en cada login.
    response.cookies.set(DEVICE_KNOWN_COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEVICE_KNOWN_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Error inesperado del servidor" },
      { status: 500 },
    );
  }
}
