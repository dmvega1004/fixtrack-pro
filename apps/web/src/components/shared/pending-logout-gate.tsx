"use client";

import { useEffect, useSyncExternalStore } from "react";
import { LogOut } from "lucide-react";
import {
  completePendingLogout,
  getServerSnapshot,
  isLogoutPending,
  subscribe,
} from "@/lib/pending-logout";

/** Respaldo de "online"/primer plano, que en Android no siempre llegan. */
const RETRY_INTERVAL_MS = 20_000;

/**
 * Tapa toda la app mientras haya un cierre de sesión sin confirmar por el
 * servidor (ver lib/pending-logout.ts) y lo termina solo apenas haya
 * señal. Vive en el layout raíz: debe actuar en cualquier pantalla en que
 * se reabra la app (tablero, /cambiar-contrasena) — con la cookie todavía
 * viva, /login rebota a "/" (proxy.ts) así que nunca se queda ahí.
 */
export function PendingLogoutGate() {
  const pending = useSyncExternalStore(subscribe, isLogoutPending, getServerSnapshot);

  useEffect(() => {
    if (!pending) return;

    let finished = false;
    const attempt = async () => {
      if (finished) return;
      if (await completePendingLogout()) {
        finished = true;
        // Navegación completa (no router.push): descarta todo el árbol de
        // React de la sesión que se acaba de cerrar.
        window.location.replace("/login");
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void attempt();
    };

    void attempt();
    window.addEventListener("online", attempt);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = window.setInterval(() => void attempt(), RETRY_INTERVAL_MS);

    return () => {
      finished = true;
      window.removeEventListener("online", attempt);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(interval);
    };
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      role="alertdialog"
      aria-labelledby="pending-logout-title"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background px-6 text-center"
    >
      <LogOut className="size-10 text-muted-foreground" aria-hidden="true" />
      <h2 id="pending-logout-title" className="text-lg font-semibold">
        Sesión cerrada en este celular
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        No hay señal para avisarle al servidor. Se termina de cerrar sola
        cuando vuelva la conexión y aparecerá la pantalla de inicio de sesión.
      </p>
    </div>
  );
}
