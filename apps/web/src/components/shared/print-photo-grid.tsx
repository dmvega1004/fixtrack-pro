import type { Attachment } from "@/lib/api/attachments";
import { cloudinaryUrl } from "@/lib/image/cloudinary-url";
import { cn } from "@/lib/utils";

const PHOTOS_PER_ROW = 3;

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

interface PrintPhotoGridProps {
  photos: Attachment[];
  /**
   * Enmarca cada fila con el borde que antes tenía el contenedor completo
   * (ver ClientReportFormatDocument). Si el contenedor se parte entre
   * hojas, el borde se dibuja incompleto — por eso va en cada fila, que
   * nunca se parte, en vez de en el contenedor.
   */
  bordered?: boolean;
  className?: string;
}

/**
 * Cuadrícula de fotos para impresión, compartida entre el informe técnico
 * y el formato del cliente (misma cuadrícula en los dos). Agrupa las fotos
 * en filas de tres EN EL MARKUP — no deja que la cuadrícula decida dónde
 * cortar — y marca cada FILA, no cada foto, como break-inside-avoid: la
 * unidad que se mueve a la hoja siguiente es una fila completa, así que el
 * hueco máximo es la altura de una fila y nunca queda media foto ni una
 * fila descabalada.
 */
export function PrintPhotoGrid({ photos, bordered, className }: PrintPhotoGridProps) {
  const rows = chunkRows(photos, PHOTOS_PER_ROW);

  return (
    <div className={cn("flex flex-col", !bordered && "gap-3", className)}>
      {rows.map((row, index) => {
        const isLastRow = index === rows.length - 1;
        return (
          <div
            key={index}
            className={cn(
              "grid grid-cols-3 gap-3 break-inside-avoid",
              bordered && "border-x border-neutral-300 px-3 pt-3",
              bordered && isLastRow && "border-b pb-3",
            )}
          >
            {row.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square overflow-hidden rounded-md border border-neutral-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- foto remota en Cloudinary, sin dominio fijo que declarar */}
                <img
                  src={cloudinaryUrl(photo.url, "print")}
                  alt="Foto de la orden"
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
