"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutEverywhere } from "@/lib/pending-logout";

export function useLogout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout(): Promise<void> {
    setIsLoading(true);
    // Lo local se borra siempre (dos técnicos pueden compartir el celular,
    // ver lib/pending-logout.ts). Si el servidor no confirmó, no se navega:
    // sin señal /login no carga, y PendingLogoutGate ya tapó la pantalla.
    const confirmed = await logoutEverywhere();
    setIsLoading(false);
    if (!confirmed) return;
    router.push("/login");
    router.refresh();
  }

  return { logout, isLoading };
}
