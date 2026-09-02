"use client";

/**
 * La caché del service worker (ver public/sw.js) guarda pantallas
 * completas con datos de órdenes de trabajo — hay que vaciarla al cerrar
 * sesión, o el siguiente usuario en el mismo dispositivo (celular
 * compartido de la empresa, turno siguiente) podría ver información de
 * la sesión anterior sin conexión, sin haber iniciado sesión él mismo.
 *
 * Cache Storage es del origen completo, no de un service worker en
 * particular, pero nada más en este sitio la usa: se borra todo sin
 * filtrar por nombre.
 */
export async function clearOfflineCaches(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch (error) {
    console.error("No se pudo limpiar la caché offline", error);
  }
}
