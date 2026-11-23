"use client";

import { clearOfflineCaches } from "./offline-cache";
import { clearWorkset } from "./sync/storage";

/**
 * Cierre de sesión que el servidor todavía no confirmó.
 *
 * La cookie de sesión es httpOnly: solo el servidor (POST /api/auth/logout)
 * puede borrarla. Sin señal esa petición nunca llega, y antes el botón
 * «Cerrar sesión» se quedaba sin hacer nada visible (la excepción del
 * fetch se escapaba y la navegación a /login moría sin red) — mientras la
 * sesión seguía viva en el celular. Ahora, si el servidor no responde:
 *
 * 1. Lo local se borra igual (caché del service worker + conjunto de
 *    trabajo), exactamente lo mismo que con señal.
 * 2. Queda una marca en localStorage — sobrevive a cerrar la app — y
 *    PendingLogoutGate (montado en el layout raíz) tapa la pantalla y
 *    termina el cierre contra el servidor apenas vuelva la señal.
 *
 * La cola de cambios pendientes NO se toca, igual que con señal: cada
 * operación lleva su userId y se sube cuando ese usuario vuelva a entrar.
 */
const STORAGE_KEY = "fixtrack:cierre-sesion-pendiente";

/** Sin esto, un servidor que no contesta con señal débil deja el botón en «Cerrando sesión...» indefinidamente. */
const SERVER_LOGOUT_TIMEOUT_MS = 8_000;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isLogoutPending(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getServerSnapshot(): boolean {
  return false;
}

function markLogoutPending(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    // Almacenamiento bloqueado: al menos la pantalla de esta pestaña queda tapada (notify abajo).
  }
  notify();
}

function clearLogoutPending(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nada que hacer
  }
  notify();
}

/** true solo si el servidor confirmó con 2xx que borró la cookie. */
export async function requestServerLogout(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      signal: AbortSignal.timeout(SERVER_LOGOUT_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Lo que se borra del celular al cerrar sesión — con o sin confirmación del servidor. */
export async function clearLocalSessionData(): Promise<void> {
  await clearOfflineCaches();
  await clearWorkset().catch((error) =>
    console.error("[sync] no se pudo limpiar el almacén local al cerrar sesión", error),
  );
}

/**
 * Cierre completo. Devuelve true si el servidor lo confirmó (quien llama
 * navega a /login); false si quedó pendiente (PendingLogoutGate ya tapó la
 * pantalla y lo termina solo).
 */
export async function logoutEverywhere(): Promise<boolean> {
  const confirmed = await requestServerLogout();
  await clearLocalSessionData();
  if (confirmed) {
    clearLogoutPending();
  } else {
    console.warn("[sesión] el servidor no respondió al cierre de sesión — se termina cuando vuelva la señal");
    markLogoutPending();
  }
  return confirmed;
}

/** Reintento desde PendingLogoutGate: true si por fin se confirmó. */
export async function completePendingLogout(): Promise<boolean> {
  if (!(await requestServerLogout())) return false;
  // Otra vez: mientras la cookie seguía viva, la app pudo volver a llenar
  // la caché y el conjunto de trabajo (al reabrirla con señal).
  await clearLocalSessionData();
  clearLogoutPending();
  return true;
}
