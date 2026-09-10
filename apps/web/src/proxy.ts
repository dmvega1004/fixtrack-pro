import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * Confirmación POSITIVA de sesión para el service worker: solo si esto
 * devuelve `true` se marca la respuesta con `x-fixtrack-shell: app`, y solo
 * entonces sw.js guarda "/" (y las demás pantallas del armazón) como
 * armazón offline. Cualquier duda —cookie ausente, token ilegible, sin
 * `exp`, vencido— devuelve `false`: la respuesta sale SIN la marca y sw.js
 * NO la guarda. El peor caso posible pasa a ser un arranque en frío sin
 * señal que cae en offline.html; nunca la landing comercial guardada donde
 * el técnico espera ver sus órdenes.
 *
 * Es una comprobación de FORMA y CADUCIDAD, no de firma: la firma la
 * verifica NestJS (JwtStrategy) en cada petición al backend, y
 * (dashboard)/layout.tsx además chequea la sesión en vivo (GET /auth/me).
 * Acá solo se decide si vale la pena que sw.js trate la respuesta como
 * cacheable.
 */
function isLiveSessionToken(token: string | undefined): boolean {
  if (!token) return false;

  const segments = token.split(".");
  if (segments.length !== 3) return false;

  try {
    let b64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    b64 += "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      exp?: unknown;
    };

    // `exp` en segundos desde epoch (RFC 7519). Sin margen: un token ya
    // vencido no se marca como armazón aunque el layout todavía alcance a
    // renderizar con él antes de que el backend lo rechace.
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasSession = Boolean(token);

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // La raíz es PÚBLICA para quien no trae cookie de sesión: ve la landing
  // comercial, servida por app/landing/page.tsx mediante una reescritura
  // interna — la barra de direcciones se queda en "/". Con cookie presente
  // (válida o no) esta rama NO se activa: el flujo sigue exactamente igual
  // que antes (el tablero, o una redirección a /login si el layout no
  // valida la sesión), así que un técnico con sesión nunca ve la landing
  // ni de reojo. Es una ruta explícitamente pública: sin esto, el bloque
  // `!hasSession` de más abajo la mandaría a /login como a cualquier otra.
  if (pathname === "/" && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.rewrite(url);
  }

  // "/landing" no es una URL pública por sí misma — solo el destino de la
  // reescritura de arriba. Quien llegue directo (un enlace viejo, un
  // rastreador) se manda a la raíz, la dirección canónica.
  if (pathname === "/landing") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  if (isLiveSessionToken(token)) {
    response.headers.set("x-fixtrack-shell", "app");
  }
  return response;
}

// Allowlist explícito de las rutas del dashboard (en vez de bloquear "todo
// menos unas excepciones"): así una petición a un asset público
// (manifest.webmanifest, sw.js, íconos) o a una ruta que no existe nunca
// pasa por este proxy y llega intacta al App Router — que la sirve o
// responde 404 real — en lugar de rebotar siempre a /login. Las páginas
// del dashboard además verifican la sesión en su propio layout
// ((dashboard)/layout.tsx), así que esta lista es una optimización de
// borde, no la única defensa.
//
// "/landing" entra a la lista solo para que la redirección canónica de
// arriba se aplique a quien lo pida directo; la reescritura interna desde
// "/" no necesita que esté acá.
export const config = {
  matcher: [
    "/",
    "/landing",
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
