import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/lib/api/auth";
import { MandatoryPasswordChangeScreen } from "@/components/profile/mandatory-password-change-screen";

/**
 * Pantalla de cambio de contraseña obligatorio. Fuera de (dashboard): no
 * hereda su layout (sin barra lateral, sin menú, sin navegación) — que
 * sea evidente que no hay nada más que hacer acá.
 *
 * Doble candado, coherente con el del layout del dashboard
 * (app/(dashboard)/layout.tsx, que redirige PARA ACÁ):
 * - Sin sesión → /login.
 * - Con sesión pero mustChangePassword=false (ej. alguien escribe esta
 *   URL a mano sin necesitarla) → nada que hacer acá, al dashboard.
 */
export default async function CambiarContrasenaPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const currentUser = await getCurrentUser();
  if (!currentUser.mustChangePassword) {
    redirect("/");
  }

  return <MandatoryPasswordChangeScreen />;
}
