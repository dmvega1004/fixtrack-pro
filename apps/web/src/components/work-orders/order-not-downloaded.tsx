import Link from "next/link";
import { CloudOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Sin señal y esta orden en particular no está en el conjunto de trabajo
 * guardado — porque es terminal (DELIVERED/CANCELLED, el almacén solo
 * trae las activas), vieja (fuera del tope de la sincronización), o de
 * otro técnico. Nunca una pantalla vacía ni el error crudo del
 * navegador: hay que decir con todas sus letras que hace falta conexión.
 */
export function OrderNotDownloaded() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <CloudOff className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Esta orden no está descargada</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          No está en lo que tienes guardado sin conexión — puede ser una
          orden cerrada, antigua, o de otro técnico. Conéctate a internet
          para verla.
        </p>
      </div>
      <Link href="/ordenes" className={buttonVariants({ variant: "outline" })}>
        Volver a Órdenes
      </Link>
    </div>
  );
}
