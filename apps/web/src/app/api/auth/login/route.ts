import { NextResponse } from "next/server";
import { login } from "@/lib/api/auth";
import { HttpError } from "@/lib/api/http";
import { SESSION_COOKIE_NAME } from "@/lib/session";

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
