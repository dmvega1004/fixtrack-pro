import { ImageOff } from "lucide-react";

/**
 * Las fotos viven en Cloudinary — sin conexión no cargan. Nunca se
 * intenta el <img src=...> offline (saldría como imagen rota, ya pasó
 * en la pantalla de sin conexión y se ve pésimo): este marcador ocupa su
 * lugar, uno por foto real, para que la cantidad se siga viendo aunque
 * el contenido no se pueda mostrar todavía. Guardar las imágenes en el
 * celular es de una entrega futura.
 */
export function OfflinePhotoPlaceholder() {
  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted p-2 text-center">
      <ImageOff className="size-5 text-muted-foreground" aria-hidden="true" />
      <span className="text-[11px] leading-tight text-muted-foreground">
        Foto no disponible sin conexión
      </span>
    </div>
  );
}
