import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PrintKeepTogetherProps {
  children: ReactNode;
  /**
   * Clases para el <td> que envuelve el contenido — usa padding (pt-, pb-),
   * NUNCA margin, para el espacio antes/después: si este bloque
   * termina abriendo una hoja nueva por la paginación, el margin en el
   * borde de un fragmento se recorta (comportamiento estándar de
   * fragmentación CSS), pero el padding no — mismo motivo por el que
   * PrintPhotoGrid mete el borde en cada <td> en vez de en el contenedor.
   */
  className?: string;
}

/**
 * Envuelve un bloque que NO debe partirse entre hojas impresas en una FILA
 * de tabla real — mismo criterio que PrintPhotoGrid con las fotos: los
 * navegadores paginan de forma fiable entre <tr>, pero ignoran
 * break-inside-avoid en un <div> anidado dentro de la celda gigante de
 * PrintDocumentFrame (o de cualquier otra tabla ancestro) — Chrome
 * fragmenta ahí sin honrar esa instrucción en los descendientes.
 */
export function PrintKeepTogether({ children, className }: PrintKeepTogetherProps) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        <tr className="break-inside-avoid">
          <td className={cn("p-0", className)}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}
