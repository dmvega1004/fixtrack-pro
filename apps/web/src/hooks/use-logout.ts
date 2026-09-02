"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearOfflineCaches } from "@/lib/offline-cache";
import { clearWorkset } from "@/lib/sync/storage";

export function useLogout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout(): Promise<void> {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Mismo lugar que la caché offline del service worker: dos técnicos
      // pueden compartir el celular, y el conjunto de trabajo guardado no
      // debe sobrevivir al cierre de sesión de quien lo dejó ahí.
      await clearOfflineCaches();
      await clearWorkset().catch((error) =>
        console.error("[sync] no se pudo limpiar el almacén local al cerrar sesión", error),
      );
      setIsLoading(false);
      router.push("/login");
      router.refresh();
    }
  }

  return { logout, isLoading };
}
