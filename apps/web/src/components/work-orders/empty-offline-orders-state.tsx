import { CloudOff } from "lucide-react";

/**
 * Sin señal Y sin nada descargado todavía — distinto de EmptyOrdersState
 * (que significa "no tienes órdenes con estos filtros", un hecho real
 * sobre tus datos). Acá no sabemos si tienes órdenes o no: nunca se pudo
 * traer nada. Decirlo con toda claridad — una lista vacía sin explicación
 * se lee como "no tienes órdenes asignadas", y eso sería mentira.
 */
export function EmptyOfflineOrdersState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <CloudOff className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">No hay datos descargados</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Todavía no te has conectado a internet en este dispositivo para
          descargar tus órdenes. Conéctate una vez y van a quedar
          disponibles también sin conexión.
        </p>
      </div>
    </div>
  );
}
