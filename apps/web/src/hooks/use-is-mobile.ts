"use client";

import { useSyncExternalStore } from "react";

/** Mismo punto de corte que "md:" en app-shell.tsx (768px) — "es móvil" significa lo mismo en toda la app. */
const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

/** El servidor no conoce el tamaño real de pantalla — arranca asumiendo escritorio, se corrige al hidratar. */
function getServerSnapshot(): boolean {
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
