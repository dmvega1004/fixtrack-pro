"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/errors/describe-error";

interface SectionErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * error.tsx reutilizable para un segmento de ruta del dashboard: reintentar
 * solo vuelve a renderizar esa sección, no la pantalla completa. El mensaje
 * distingue sin conexión / tiempo agotado / error del servidor — ver
 * lib/errors/describe-error.
 */
export function SectionError({ error, reset }: SectionErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const { Icon, message } = describeError(error.digest);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <p className="text-sm font-medium">{message}</p>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
