"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { LogoutButton } from "@/components/shared/logout-button";

/**
 * Pantalla de /cambiar-contrasena — fuera del layout del dashboard (sin
 * barra lateral, sin menú): no hay nada más que hacer acá. El único
 * camino de salida sin cambiar la contraseña es cerrar sesión.
 */
export function MandatoryPasswordChangeScreen() {
  const router = useRouter();

  function handleSuccess() {
    // replace (no push) — no tiene sentido dejar /cambiar-contrasena en el
    // historial: "atrás" desde el dashboard volvería a ejecutar el guard
    // de esa página, que ya redirige para acá sola. SIN router.refresh():
    // llamarlo justo después de push/replace compite con la navegación en
    // curso y puede dejar el router colgado en la ruta vieja — la
    // navegación a "/" ya trae los datos frescos por su cuenta (el layout
    // del dashboard vuelve a llamar a GET /auth/me, sin caché).
    router.replace("/");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image
            src="/brand/logo-sm.png"
            alt="FixTrack Pro"
            width={200}
            height={46}
            priority
            unoptimized
          />
          <CardDescription>
            Tu contraseña actual fue asignada por un administrador. Antes de
            continuar, debes definir una propia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
      <LogoutButton />
    </div>
  );
}
