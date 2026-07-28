"use client";

import { useEffect } from "react";
import Image from "next/image";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Image
        src="/brand/logo-sm.png"
        alt="FixTrack Pro"
        width={140}
        height={32}
        unoptimized
        className="h-8 w-auto opacity-80"
      />
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          No pudimos cargar los datos. Verifica tu conexión e intenta de nuevo.
        </p>
      </div>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
