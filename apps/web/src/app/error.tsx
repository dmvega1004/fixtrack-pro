"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/errors/describe-error";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * error.tsx de un segmento NO atrapa los errores de su propio layout.tsx
 * (solo los de sus páginas/segmentos hijos) — y (dashboard)/layout.tsx hace
 * una verificación en vivo contra el backend (getCurrentUser) en TODA
 * ruta del dashboard. Sin este boundary a nivel raíz, una falla de red en
 * ese chequeo puntual escapaba a la pantalla de error genérica de Next en
 * vez de mostrar el mensaje de sin conexión / tiempo agotado.
 */
export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const { Icon, message } = describeError(error.digest);

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Image
        src="/brand/logo-sm.png"
        alt="FixTrack Pro"
        width={140}
        height={32}
        unoptimized
        className="h-8 w-auto opacity-80"
      />
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
