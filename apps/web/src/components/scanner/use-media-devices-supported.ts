"use client";

import { useSyncExternalStore } from "react";

// El soporte de getUserMedia no cambia durante la vida de la página, así que
// no hay nada a lo que suscribirse — solo necesitamos leer el valor una vez
// que estamos en el cliente sin disparar un setState en un efecto (mismo
// patrón que useOnlineStatus).
function subscribe(): () => void {
  return () => {};
}

function getSnapshot(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useMediaDevicesSupported(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
