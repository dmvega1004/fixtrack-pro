// Etapa 1-A del soporte offline: el armazón del service worker. Sigue
// SIN ser soporte offline completo — nada de esto cachea datos de
// negocio ni convierte pantallas a renderizado en el cliente (eso es
// 1-B/1-C). Solo demuestra, y ahora corrige, que un service worker
// puede servir una pantalla guardada dentro del WebView del APK cuando
// no hay señal — capacitor.config.ts apunta a server.url =
// https://fixtrackpro.com, y el WebView carga ese mismo sitio en vivo,
// así que este mismo sw.js corre igual adentro del APK que en cualquier
// navegador, sin nada especial de Capacitor.
//
// Estrategia: "red primero, caché de respaldo", ACOTADA a navegaciones
// (request.mode === "navigate"). Todo lo demás — /api, imágenes de
// Cloudinary, lo que sea — pasa directo a la red, sin tocar acá.

const CACHE_VERSION = "v2";
const CACHE_NAME = `fixtrack-shell-${CACHE_VERSION}`;
const CACHE_PREFIX = "fixtrack-shell-";
const SHELL_URLS = ["/", "/ordenes"];
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(precacheShell());
});

/**
 * Precachea el armazón mínimo: la pantalla de "sin conexión" propia (no
 * la de Capacitor), "/" y "/ordenes" — la app puede arrancar en frío en
 * cualquiera de las dos —, y los assets de /_next/static que esas
 * páginas referencian. Se descubren leyendo el HTML de cada respuesta,
 * no hay forma de conocer sus nombres con hash de antemano sin tocar el
 * build (fuera de alcance de esta prueba).
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
    if (response.ok) {
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
