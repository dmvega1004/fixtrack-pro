"use client";

import { useEffect } from "react";

/**
 * Pide al service worker que reintente precachear el armazón offline
 * (ver el listener de "message" en public/sw.js) cada vez que el panel
 * carga con una sesión válida — este componente vive en
 * (dashboard)/layout.tsx, que ya redirige a /login sin sesión, así que
 * llegar a montarse ES la señal de que hay una sesión con la que precachear.
 *
 * Por qué hace falta esto y no basta con el evento install: el service
 * worker se instala la PRIMERA vez que alguien abre la app — que para
 * cualquier técnico nuevo es en la pantalla de login, sin sesión todavía.
 * "/", "/ordenes" y "/ordenes/detalle-offline" exigen sesión (ver
 * (dashboard)/layout.tsx), así que ese primer precacheo las descarta a
 * las tres (redirigen a /login — ver precacheShellUrl en sw.js). "/" y
 * "/ordenes" alcanzan a autocurarse solas la próxima vez que alguien
 * navega ahí con señal, pero NADIE navega nunca a
 * "/ordenes/detalle-offline" a propósito — solo la sirve el service
 * worker — así que sin este aviso esa dirección se queda vacía para
 * siempre y el detalle de cualquier orden nunca visitada cae en
 * offline.html sin conexión, sin importar cuánto tiempo lleve instalada
 * la app.
 *
 * Se dispara en CADA carga del panel (no solo "justo después del
 * login") — barato si ya estaba todo bien precacheado (unas pocas
 * peticiones que Chrome puede resolver de caché HTTP) y es lo que
 * resuelve, sin lógica aparte, los casos reales: sesión que caduca y se
 * vuelve a iniciar, o un celular compartido entre dos técnicos — cada
 * vez que alguien entra con su propia sesión, el armazón se refresca con
 * los datos de ESA sesión, nunca se queda pegado a la de quien lo usó
 * antes.
 */
export function ShellCacheRefresh() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    // `.ready` nunca rechaza — espera indefinidamente a que haya un
    // service worker activo para esta página. Si nunca lo hay (ej. el
    // registro en sí falló), este componente simplemente no llega a
    // avisar nada; la próxima carga del panel lo vuelve a intentar.
    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return;
      registration.active?.postMessage({ type: "fixtrack-refresh-shell-cache" });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
