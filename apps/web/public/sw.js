// Etapa 1-A del soporte offline: el armazón del service worker. Ya no es
// solo el armazón — Etapa 2-D agrega la pantalla de repuesto para
// /ordenes/<id> (única dirección con identificador variable que puede
// pedirse sin haberse precacheado nunca), cierra el hueco de precacheo
// envenenado por un redirect a /login, y reintenta ese mismo precacheo
// cuando la página lo pide (ver el listener de "message" más abajo) —
// para el técnico nuevo que instala el service worker ANTES de iniciar
// sesión, que es el camino por defecto, no un caso raro.
//
// Desde que "/" tiene una landing comercial pública (app/landing/), un
// GET a "/" sin sesión ya no redirige a /login: responde 200 con la
// landing. Para que esa página nunca acabe guardada como armazón, tanto
// el precacheo como la caché oportunista exigen una CONFIRMACIÓN POSITIVA
// —la cabecera `x-fixtrack-shell: app` que proxy.ts pone solo con sesión
// válida y vigente— antes de guardar "/" o cualquier navegación. Sin esa
// cabecera no se guarda: el peor caso es caer en offline.html, nunca
// mostrar publicidad donde el técnico espera sus órdenes.
// capacitor.config.ts apunta a server.url = https://fixtrackpro.com, y el
// WebView carga ese mismo sitio en vivo, así que este mismo sw.js corre
// igual adentro del APK que en cualquier navegador, sin nada especial de
// Capacitor.
//
// Estrategia: "red primero, caché de respaldo", ACOTADA a navegaciones
// (request.mode === "navigate"). Todo lo demás — /api, imágenes de
// Cloudinary, lo que sea — pasa directo a la red, sin tocar acá.

const CACHE_VERSION = "v3";
const CACHE_NAME = `fixtrack-shell-${CACHE_VERSION}`;
const CACHE_PREFIX = "fixtrack-shell-";
const SHELL_URLS = ["/", "/ordenes", "/ordenes/detalle-offline"];
const OFFLINE_URL = "/offline.html";
const SPARE_ORDER_DETAIL_URL = "/ordenes/detalle-offline";

/**
 * /ordenes/<id> — un solo segmento después de /ordenes, que NO sea uno de
 * los literales que ya tienen su propia entrada precacheada (nueva,
 * detalle-offline) ni la lista misma. Mismo patrón (duplicado a propósito
 * — este archivo no puede importar nada del build de Next) en
 * OrderDetailOfflineByPath (apps/web/src/components/work-orders/
 * offline-detail/order-detail-offline-by-path.tsx).
 */
const ORDER_DETAIL_PATTERN = /^\/ordenes\/(?!nueva$|detalle-offline$)[^/]+$/;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(precacheShell());
});

/**
 * Reintento del precacheo, pedido por la página (ver shell-cache-refresh.tsx)
 * en vez de dejarlo solo para el evento install. Sin esto, un service
 * worker que se instaló SIN sesión válida (el camino de cualquier técnico
 * nuevo: abre la app, ve /login, ahí mismo se instala) nunca vuelve a
 * intentar precachear "/", "/ordenes" ni "/ordenes/detalle-offline" — las
 * tres redirigieron a /login y precacheShellUrl las descartó con razón
 * (ver ese comentario). "/" y "/ordenes" alcanzan a autocurarse solos la
 * próxima vez que alguien navega ahí con señal (navigateNetworkFirst
 * guarda la respuesta de cualquier navegación exitosa) — pero nadie
 * navega NUNCA a "/ordenes/detalle-offline" a propósito, solo la sirve
 * este mismo service worker (ver navigateNetworkFirst más abajo), así que
 * sin este mensaje esa dirección se queda vacía para siempre y el
 * detalle de cualquier orden nunca visitada cae en offline.html sin
 * conexión.
 *
 * HUELLA (W5): antes esto corría en CADA carga del panel — tres páginas
 * completas más sus archivos, con datos móviles, compitiendo con la
 * pantalla que el técnico abre. Ahora la página manda una huella (id del
 * usuario + commit publicado) y se SALTA el precacheo si la última vez que
 * las TRES páginas pasaron el candado fue con la misma huella, el mismo
 * CACHE_NAME y hace menos de SHELL_REFRESH_MAX_AGE_MS, y las tres siguen
 * en la caché. Cualquier duda (sin huella, huella distinta, registro
 * ilegible, alguna página que no pasó) ⇒ se precachea como antes: el
 * peor caso es gastar datos, nunca quedarse con un armazón viejo o ajeno.
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "fixtrack-refresh-shell-cache") {
    const fingerprint =
      typeof event.data.fingerprint === "string" && event.data.fingerprint
        ? event.data.fingerprint
        : null;
    event.waitUntil(refreshShellIfStale(fingerprint));
  }
});

/**
 * Caché APARTE para el registro de la huella: no empieza con CACHE_PREFIX,
 * así que la limpieza de "activate" no la borra, y no se mezcla con las
 * pantallas. Si CACHE_NAME cambia, el registro deja de coincidir (guarda
 * el CACHE_NAME con el que se hizo) y se precachea de nuevo.
 */
const META_CACHE_NAME = "fixtrack-meta";
const META_SHELL_KEY = "/__fixtrack-meta/armazon";
/** 12 h: una jornada; al día siguiente se refresca aunque nada cambie. */
const SHELL_REFRESH_MAX_AGE_MS = 12 * 60 * 60 * 1000;

async function refreshShellIfStale(fingerprint) {
  if (fingerprint && (await shellIsFresh(fingerprint))) {
    console.log("[sw] armazón al día para esta huella — no se precachea");
    return;
  }
  const allPassed = await precacheShell();
  if (!fingerprint || !allPassed) return;
  try {
    const meta = await caches.open(META_CACHE_NAME);
    await meta.put(
      META_SHELL_KEY,
      new Response(JSON.stringify({ fingerprint, cacheName: CACHE_NAME, at: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  } catch (error) {
    // Sin registro, la próxima carga simplemente vuelve a precachear.
    console.error("[sw] No se pudo guardar la huella del armazón", error);
  }
}

async function shellIsFresh(fingerprint) {
  try {
    const meta = await caches.open(META_CACHE_NAME);
    const stored = await meta.match(META_SHELL_KEY);
    if (!stored) return false;
    const record = await stored.json();
    if (record.fingerprint !== fingerprint) return false;
    if (record.cacheName !== CACHE_NAME) return false;
    const age = Date.now() - record.at;
    if (!(age >= 0 && age < SHELL_REFRESH_MAX_AGE_MS)) return false;
    // Las tres páginas tienen que seguir ahí (el navegador puede desalojar).
    const cache = await caches.open(CACHE_NAME);
    for (const url of SHELL_URLS) {
      if (!(await cache.match(url))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Precachea el armazón mínimo: la pantalla de "sin conexión" propia (no
 * la de Capacitor), "/", "/ordenes" y "/ordenes/detalle-offline" — la app
 * puede arrancar en frío en cualquiera de las tres —, y los assets de
 * /_next/static que esas páginas referencian. Se descubren leyendo el
 * HTML de cada respuesta, no hay forma de conocer sus nombres con hash de
 * antemano sin tocar el build (fuera de alcance de esta prueba).
 */
async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);

  try {
    await cache.add(OFFLINE_URL);
  } catch (error) {
    console.error("[sw] No se pudo precachear offline.html", error);
  }

  const results = await Promise.all(SHELL_URLS.map((url) => precacheShellUrl(cache, url)));
  // true solo si las TRES pasaron el candado y se guardaron (ver W5 arriba).
  return results.every(Boolean);
}

async function precacheShellUrl(cache, shellUrl) {
  try {
    const shellResponse = await fetch(shellUrl);
    if (!shellResponse.ok) return false;

    // "/", "/ordenes" y "/ordenes/detalle-offline" exigen sesión (las
    // sirve (dashboard)/layout.tsx, que redirige a /login sin una). Si el
    // service worker instala o se actualiza SIN sesión válida (ej. la
    // pestaña está en /login, o el token venció), esta respuesta ES la
    // página de login — jamás la página pedida. Guardarla igual deja la
    // caché "envenenada": la próxima vez que esa dirección se pida sin
    // red, Chrome se niega a servir una Response redirigida como
    // respuesta de una navegación y falla la carga entera con
    // net::ERR_FAILED — ni siquiera se ve offline.html, se ve como si la
    // app estuviera rota. Se salta la caché (queda como estaba, vacía la
    // primera vez) y se resuelve solo en la próxima navegación exitosa a
    // esa misma dirección con sesión (ver navigateNetworkFirst).
    if (shellResponse.redirected) {
      console.warn(`[sw] ${shellUrl} redirigió al precachear (sin sesión válida) — no se guarda`);
      return false;
    }

    // Confirmación POSITIVA antes de guardar: proxy.ts marca con
    // `x-fixtrack-shell: app` únicamente las respuestas servidas con una
    // sesión válida y vigente. Sin esa marca no se guarda NADA en esta
    // dirección. El caso que esto ataja: "/" sin sesión ya no redirige a
    // /login (el candado de arriba) sino que sirve 200 la landing
    // comercial — indistinguible de la app para el chequeo `redirected`.
    // La regla se invierte a propósito: ante la marca ausente (un error,
    // un cambio futuro, una capa intermedia que la borre) el
    // comportamiento por defecto es NO guardar, así que el peor caso es un
    // arranque en frío que cae en offline.html, nunca la landing donde el
    // técnico espera sus órdenes.
    if (shellResponse.headers.get("x-fixtrack-shell") !== "app") {
      console.warn(
        `[sw] ${shellUrl} sin la marca de armazón autenticado (x-fixtrack-shell) — no se guarda`,
      );
      return false;
    }

    const html = await shellResponse.clone().text();
    await cache.put(shellUrl, shellResponse);

    const assetUrls = extractStaticAssetUrls(html);
    await Promise.all(
      assetUrls.map(async (url) => {
        try {
          const assetResponse = await fetch(url);
          if (assetResponse.ok) await cache.put(url, assetResponse);
        } catch {
          // Un asset suelto que falle no debe tumbar la instalación
          // completa del service worker.
        }
      }),
    );
    return true;
  } catch (error) {
    // Sin red durante la instalación (ej. primera apertura del APK sin
    // señal): no hay nada que precachear todavía más allá de
    // offline.html. La próxima navegación exitosa completa la caché —
    // ver navigateNetworkFirst más abajo.
    console.error(`[sw] No se pudo precachear ${shellUrl}`, error);
    return false;
  }
}

/** Extrae URLs de /_next/static referenciadas en <script src> / <link href>. */
function extractStaticAssetUrls(html) {
  const urls = new Set();
  const attrPattern = /(?:href|src)="(\/_next\/static\/[^"]+)"/g;
  let match;
  while ((match = attrPattern.exec(html)) !== null) {
    urls.add(match[1]);
  }
  return [...urls];
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      // Navigation Preload: el navegador lanza la petición de la navegación
      // EN PARALELO con el arranque de este service worker, en vez de
      // esperar a que arranque para que el fetch() de navigateNetworkFirst
      // recién salga. En producción se midió ~160 ms de arranque en
      // escritorio antes de que saliera la petición; en un Android de gama
      // baja es bastante más, y se paga en CADA navegación. No cambia la
      // estrategia: navigateNetworkFirst consume event.preloadResponse en
      // lugar de su propio fetch y le aplica exactamente los mismos
      // candados. Sin soporte (navegadores viejos) no pasa nada: se queda
      // el fetch() de siempre.
      //
      // ⚠️ APAGADA DENTRO DEL APK (vista web de Android). La carga
      // anticipada se agregó el 2026-11-10 (commit d0f9ef6) y es la
      // sospechosa de haber roto la navegación sin señal en el APK: sin
      // red, la petición anticipada falla, la vista web lo informa como
      // error de la página principal (onReceivedError) y Capacitor carga
      // su errorPath ENCIMA de la página que este service worker sí sirvió
      // desde la caché. En Chrome ese aviso no existe y todo funciona.
      // Prueba de campo del 2026-11-24 (APK 1.1.0, Android 16). Experimento
      // en curso: si con esto el APK navega sin señal, queda confirmado.
      // NO volver a activarla en el APK sin probar en un celular real, en
      // modo avión, recargar y abrir la app sin señal.
      if (self.registration.navigationPreload) {
        if (isAndroidWebView()) {
          await self.registration.navigationPreload.disable();
        } else {
          await self.registration.navigationPreload.enable();
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.mode !== "navigate") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(navigateNetworkFirst(request, event.preloadResponse));
});

async function navigateNetworkFirst(request, preloadResponse) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // request.clone(): un Request no se puede reusar después de pasarlo a
    // fetch() (queda "consumido" incluso sin body, como en un GET). Sin
    // el clone, el cache.match(request) del catch de abajo lanza una
    // excepción — y una excepción sin capturar dentro de un fetch handler
    // hace que el navegador falle la navegación entera con ERR_FAILED en
    // vez de mostrar cualquier respuesta.
    //
    // preloadResponse (Navigation Preload, ver "activate"): la respuesta de
    // la petición que el navegador ya lanzó mientras este worker arrancaba.
    // Resuelve a undefined si el preload no está activo (primera
    // navegación antes de activarse, navegador sin soporte) → se cae al
    // fetch() de siempre. Si la red falla, RECHAZA igual que fetch(): cae
    // al mismo catch de abajo, con la misma lectura de caché. La respuesta
    // pasa por los mismos candados que la del fetch().
    const response =
      (preloadResponse && (await preloadResponse)) ||
      (await fetch(request.clone()));

    // Mismo par de candados que en precacheShellUrl:
    //  1. `!response.redirected` — una navegación real (ej. el token
    //     venció a mitad de jornada y esta petición terminó en /login)
    //     puede terminar redirigida tan fácil como el precacheo inicial.
    //  2. `x-fixtrack-shell: app` — confirmación POSITIVA de proxy.ts de
    //     que esto se sirvió con sesión válida. Sin esa marca no se
    //     guarda: cubre "/" sirviendo 200 la landing comercial a quien no
    //     trae sesión (que el chequeo `redirected` no distingue de la
    //     app), y deja como comportamiento por defecto —ante cualquier
    //     duda— NO tocar la entrada anterior.
    const isAuthenticatedShell =
      response.headers.get("x-fixtrack-shell") === "app";
    if (response.ok && !response.redirected && isAuthenticatedShell) {
      // Clave de caché SIN cadena de consulta: /ordenes?estado=abierta,
      // /ordenes?estado=cerrada, etc. son la MISMA pantalla guardada —
      // sin esto se acumula una entrada distinta por cada combinación de
      // filtros que use un técnico. La lectura de abajo usa ignoreSearch
      // para encontrarla sin importar qué filtro traiga la navegación.
      await cache.put(stripSearch(request.url), response.clone());
    }
    return response;
  } catch {
    // ignoreSearch: true — la ruta real del técnico lleva filtros
    // (/ordenes?estado=abierta), que nunca coinciden con la entrada
    // guardada (sin query) si no se ignora la cadena de consulta al
    // buscar. Esto implica que SIN SEÑAL se ve la pantalla sin filtrar:
    // es lo correcto, los filtros se aplican contra datos que no
    // tenemos.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // /ordenes/<id>: hay tantas direcciones como órdenes, así que ninguna
    // se precachea individual — la única forma de que caiga hasta acá con
    // ALGO que no sea offline.html es servir la pantalla de repuesto
    // (Etapa 2-D), precacheada UNA sola vez, EN ESTA MISMA dirección. Esa
    // pantalla lee el id real de `window.location.pathname` del lado del
    // cliente (ver OrderDetailOfflineByPath) — la barra de direcciones no
    // cambia, sigue siendo /ordenes/<id>.
    const pathname = new URL(request.url).pathname;
    if (ORDER_DETAIL_PATTERN.test(pathname)) {
      const spare = await cache.match(SPARE_ORDER_DETAIL_URL);
      if (spare) return spare;
    }

    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;

    // Último recurso si ni siquiera offline.html se pudo precachear
    // (instalación del service worker sin ninguna conexión previa).
    return new Response("Sin conexión", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * ¿Corre dentro de la vista web de Android (el APK)? El token `wv` lo pone
 * Android en el agente de usuario de toda vista web, incluidos los APK
 * 1.0.0 que no traen `FixTrackApp` (ver capacitor.config.ts y proxy.ts,
 * isAppWebView). Se revisan los dos por si el service worker no hereda el
 * agente modificado.
 */
function isAndroidWebView() {
  const ua = self.navigator.userAgent;
  return /;\s*wv\)/.test(ua) || ua.includes("FixTrackApp");
}

/** Quita la cadena de consulta de una URL, para usarla como clave de caché. */
function stripSearch(url) {
  const stripped = new URL(url);
  stripped.search = "";
  return stripped.toString();
}
