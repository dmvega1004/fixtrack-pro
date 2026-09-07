import type { ReactNode } from "react";
import { Lock } from "lucide-react";

interface OfflineDisabledNoticeProps {
  label: string;
  reason?: string;
  children?: ReactNode;
}

/**
 * Bloque compartido para TODO lo que la Etapa 2-C deja desactivado sin
 * conexión (fotos, firma, repuestos, valores, imprimir, cuenta de cobro,
 * eliminar, y el resto de bloques admin-only del detalle) — nunca oculto
 * sin más: sigue el principio de la Etapa 1-C-3 ("un control desactivado
 * dice por qué"), así el técnico nunca confunde "todavía no implementado"
 * con "se rompió". `children` es opcional: contenido de solo lectura
 * debajo del aviso (ej. las firmas o repuestos ya guardados).
 */
export function OfflineDisabledNotice({
  label,
  reason = "No disponible sin conexión.",
  children,
}: OfflineDisabledNoticeProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{reason}</p>
      {children}
    </div>
  );
}
