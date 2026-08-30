import type { Attachment } from "@/lib/api/attachments";
import { cloudinaryUrl } from "@/lib/image/cloudinary-url";
import { cn } from "@/lib/utils";

const PHOTOS_PER_ROW = 2;

/**
 * Altura fija de la celda de foto. No se usa aspect-ratio porque la
 * proporción no se resuelve dentro de una celda de tabla (ver commit que
 * introdujo esta regresión) — una altura explícita en milímetros sí.
 */
const PHOTO_CELL_HEIGHT = "65mm";

function chunkRows<T>(items: T[], size: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += size) {
    const row: (T | null)[] = items.slice(i, i + size);
    while (row.length < size) row.push(null);
    rows.push(row);
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
 * y el formato del cliente. Es una TABLA real — cada fila de fotos es un
 * <tr> y cada foto un <td> — porque los navegadores paginan entre filas de
 * tabla de forma fiable; break-inside-avoid en un <div> dentro de la celda
 * de PrintDocumentFrame no se respeta (Chrome fragmenta ahí sin honrar esa
 * instrucción en los descendientes).
 *
 * Dos fotos por fila (no tres): a tres, cada foto queda en ~59mm de ancho,
 * demasiado angosto para leer el detalle de una foto técnica (un hueco en
 * el cielorraso, una conexión). A dos, quedan cerca de 90mm.
 *
 * object-contain, no object-cover: son evidencia técnica, recortarlas para
 * llenar la caja puede destruir justo lo que documentan. El fondo gris muy
 * claro de la celda hace que el espacio que deja object-contain se vea
 * intencional.
 */
export function PrintPhotoGrid({ photos, bordered, className }: PrintPhotoGridProps) {
  const rows = chunkRows(photos, PHOTOS_PER_ROW);

  return (
    <table className={cn("w-full table-fixed border-collapse", className)}>
      <tbody>
        {rows.map((row, rowIndex) => {
          const isLastRow = rowIndex === rows.length - 1;
          return (
            <tr key={rowIndex} className="break-inside-avoid">
              {row.map((photo, colIndex) => (
                <td
                  key={photo?.id ?? colIndex}
                  className={cn(
                    "w-1/2 p-1.5 align-top",
                    bordered && "border-neutral-300",
                    bordered && colIndex === 0 && "border-l",
                    bordered && colIndex === row.length - 1 && "border-r",
                    bordered && isLastRow && "border-b",
                  )}
                >
                  {photo && (
                    <div
                      className="flex items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-50"
                      style={{ height: PHOTO_CELL_HEIGHT }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- foto remota en Cloudinary, sin dominio fijo que declarar */}
                      <img
                        src={cloudinaryUrl(photo.url, "print")}
                        alt="Foto de la orden"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
