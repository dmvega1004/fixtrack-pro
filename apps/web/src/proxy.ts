import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  DEVICE_KNOWN_COOKIE_NAME,
  DEVICE_KNOWN_COOKIE_MAX_AGE,
} from "@/lib/session";

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

/**
 * ¿La petición viene de la app instalada (el APK), no de un navegador?
 * Es una vista web de Android empaquetada con Capacitor. Quien la abre
 * SIEMPRE es un usuario, jamás un prospecto: ahí la landing comercial no
 * se muestra nunca. Sirve de respaldo si la marca de dispositivo conocido
 * se pierde (borrado de datos de la app, instalación recién hecha).
 *
 * Señal que funciona en los APK YA instalados: el token `wv` que Android
 * agrega al user-agent de toda WebView. Se excluyen los navegadores
 * embebidos de apps sociales (Instagram, Facebook, etc.) — también son
 * WebView, pero por ahí sí puede llegar alguien que nunca ha usado
 * FixTrack.
 *
 * Señal explícita para builds futuros: `appendUserAgent: "FixTrackApp"`
 * en apps/mobile/capacitor.config.ts. Requiere `npx cap sync` y
 * redistribuir el APK para surtir efecto; hasta entonces manda el `wv`.
 */
function isAppWebView(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  if (ua.includes("FixTrackApp")) return true;

  if (!/\bwv\b/.test(ua)) return false;

  const socialInAppBrowser =
    /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|MicroMessenger|Snapchat|Pinterest|TikTok|musical_ly|GSA\//i.test(
      ua,
    );
  return !socialInAppBrowser;
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

  // La raíz muestra la landing comercial SOLO a quien nunca ha iniciado
  // sesión en este dispositivo. Un técnico cuya sesión de 8 h venció ya no
  // tiene cookie de sesión, pero sí la marca de dispositivo conocido (o
  // entra por el APK): a ese se le manda a /login, igual que antes de que
  // existiera la landing. Con cookie de sesión presente (válida o no) esta
  // rama ni se evalúa: el flujo sigue como siempre (tablero, o /login si
  // el layout no valida la sesión).
  //
  // La landing se sirve por reescritura interna desde app/landing/page.tsx
  // — la barra de direcciones se queda en "/". Es una ruta explícitamente
  // pública: sin esto, el bloque `!hasSession` de más abajo la mandaría a
  // /login como a cualquier otra.
  if (pathname === "/" && !hasSession) {
    const knownDevice =
      Boolean(request.cookies.get(DEVICE_KNOWN_COOKIE_NAME)?.value) ||
      isAppWebView(request);

    if (knownDevice) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

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

    // Siembra la marca de dispositivo conocido para las sesiones que ya
    // estaban abiertas antes de este cambio (el login nuevo ya la
    // escribe). Solo si falta: así no se manda un Set-Cookie en cada
    // petición. Como el login la reescribe fresca al menos cada 8 h, su
    // año de vigencia nunca se acerca a expirar en un dispositivo en uso.
    if (!request.cookies.get(DEVICE_KNOWN_COOKIE_NAME)?.value) {
      response.cookies.set(DEVICE_KNOWN_COOKIE_NAME, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: DEVICE_KNOWN_COOKIE_MAX_AGE,
      });
    }
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
