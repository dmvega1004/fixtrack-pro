import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Allowlist explícito de las rutas del dashboard (en vez de bloquear "todo
// menos unas excepciones"): así una petición a un asset público
// (manifest.webmanifest, sw.js, íconos) o a una ruta que no existe nunca
// pasa por este proxy y llega intacta al App Router — que la sirve o
// responde 404 real — en lugar de rebotar siempre a /login. Las páginas
// del dashboard además verifican la sesión en su propio layout
// ((dashboard)/layout.tsx), así que esta lista es una optimización de
// borde, no la única defensa.
export const config = {
  matcher: [
    "/",
    "/login",
    "/clientes/:path*",
    "/cobros/:path*",
    "/cotizaciones/:path*",
    "/empresa/:path*",
    "/equipos/:path*",
    "/escanear/:path*",
    "/inventario/:path*",
    "/mantenimiento/:path*",
    "/ordenes/:path*",
    "/perfil/:path*",
    "/personal/:path*",
  ],
};
