import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

/**
 * GET: usado para redirects server-side (ej. sesión expirada detectada en
 * un fetch al backend). Limpia la cookie antes de mandar a /login; si solo
 * redirigiéramos, el proxy la vería "presente" y rebotaría de vuelta a "/".
 */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
