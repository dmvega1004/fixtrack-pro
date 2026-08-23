// Service worker mínimo: solo existe para que Chrome considere el sitio
// instalable como PWA. No implementa caché ni soporte offline.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
