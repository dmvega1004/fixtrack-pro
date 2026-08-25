import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/lib/api/auth";
import { AppShell } from "@/components/shared/app-shell";
import { OfflineBanner } from "@/components/shared/offline-banner";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Chequeo EN VIVO contra el backend (GET /auth/me), no el del JWT
  // firmado: mustChangePassword puede cambiar sin que se emita un token
  // nuevo (ej. un ADMIN restablece la contraseña de este usuario mientras
  // su sesión sigue abierta) — el claim del JWT quedaría desactualizado.
  // Corre en TODA ruta del dashboard: no hay forma de esquivarlo
  // navegando directo a una URL interna.
  const currentUser = await getCurrentUser();
  if (currentUser.mustChangePassword) {
    redirect("/cambiar-contrasena");
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <OfflineBanner />
      <AppShell session={session}>{children}</AppShell>
    </div>
  );
}
