// Etapa 1-A del soporte offline: el armazón del service worker. Ya no es
// solo el armazón — Etapa 2-D agrega la pantalla de repuesto para
// /ordenes/<id> (única dirección con identificador variable que puede
// pedirse sin haberse precacheado nunca) y cierra el hueco de precacheo
// envenenado por un redirect a /login (ver skipIfRedirected más abajo).
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

  await Promise.all(SHELL_URLS.map((url) => precacheShellUrl(cache, url)));
}

async function precacheShellUrl(cache, shellUrl) {
  try {
    const shellResponse = await fetch(shellUrl);
    if (!shellResponse.ok) return;

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
      return;
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
  } catch (error) {
    // Sin red durante la instalación (ej. primera apertura del APK sin
    // señal): no hay nada que precachear todavía más allá de
    // offline.html. La próxima navegación exitosa completa la caché —
    // ver navigateNetworkFirst más abajo.
    console.error(`[sw] No se pudo precachear ${shellUrl}`, error);
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
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.mode !== "navigate") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(navigateNetworkFirst(request));
});

async function navigateNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // request.clone(): un Request no se puede reusar después de pasarlo a
    // fetch() (queda "consumido" incluso sin body, como en un GET). Sin
    // el clone, el cache.match(request) del catch de abajo lanza una
    // excepción — y una excepción sin capturar dentro de un fetch handler
    // hace que el navegador falle la navegación entera con ERR_FAILED en
    // vez de mostrar cualquier respuesta.
    const response = await fetch(request.clone());

    // Mismo candado que en precacheShellUrl: una navegación real (ej. el
    // token venció a mitad de jornada y esta petición terminó en /login)
    // puede terminar en una respuesta redirigida tan fácil como el
    // precacheo inicial. Guardarla envenenaría esta entrada de caché para
    // la próxima vez que se pida sin red — se deja la entrada anterior
    // (si había alguna) tal cual, en vez de pisarla con la de /login.
    if (response.ok && !response.redirected) {
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

/** Quita la cadena de consulta de una URL, para usarla como clave de caché. */
function stripSearch(url) {
  const stripped = new URL(url);
  stripped.search = "";
  return stripped.toString();
}
