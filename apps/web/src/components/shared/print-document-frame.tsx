import type { ReactNode } from "react";

interface PrintDocumentFrameProps {
  /**
   * Pie de página del documento. Si no hay (ej. cliente sin
   * reportFormatFooter configurado), el contenido se renderiza sin tabla —
   * no hay nada que repetir entre hojas.
   */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Andamio de paginación de los documentos imprimibles: envuelve el
 * contenido en una tabla con tbody/tfoot en vez de depender de un pie con
 * position:fixed. Un elemento fixed solo se ancla a la página si NINGÚN
 * contenedor entre él y la raíz tiene transform, filter, backdrop-filter,
 * perspective, contain o will-change — si alguno lo tiene (ahora o en el
 * futuro, con cualquier cambio en el árbol de componentes), el pie se
 * ancla ahí y queda a mitad de hoja. tfoot no depende de eso: los
 * navegadores lo repiten al final de cada hoja impresa, reservando su
 * espacio automáticamente, sin superponerse al contenido.
 *
 * La tabla es solo andamiaje: sin bordes propios, sin espaciado entre
 * celdas, ancho completo — el documento se ve igual que si no existiera.
 * tfoot se renderiza después de tbody en pantalla también (así lo ordena
 * CSS para los grupos de fila de una tabla, sin importar el orden en el
 * markup), así que sirve igual para la vista previa en pantalla.
 */
export function PrintDocumentFrame({ footer, children }: PrintDocumentFrameProps) {
  if (!footer) {
    return <>{children}</>;
  }

  return (
    <table className="w-full border-collapse">
      <tbody>
        <tr>
          <td className="p-0">{children}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td className="p-0">{footer}</td>
        </tr>
      </tfoot>
    </table>
  );
}
