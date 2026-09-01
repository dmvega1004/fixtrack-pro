import { cloudinaryUrl } from "@/lib/image/cloudinary-url";
import { cn } from "@/lib/utils";

/**
 * Separación entre el borde inferior de la rúbrica y el renglón: la
 * imagen NUNCA toca ni cruza la línea, siempre queda un margen mínimo por
 * encima.
 */
const SIGNATURE_LINE_GAP_MM = 1;

interface SignatureLineProps {
  /**
   * URL de Cloudinary de la firma a estampar. `null`/`undefined` (sin
   * imagen cargada, o el documento tiene la casilla desactivada) deja la
   * línea exactamente como hoy — sin huecos ni espacio reservado de más.
   */
  signatureImageUrl?: string | null;
  /**
   * Tamaño de la rúbrica en mm. Por defecto 50×22 (firma INSTITUCIONAL de
   * la empresa, cuenta de cobro — sin cambios). Las firmas PERSONALES
   * (técnico/quien recibe, Módulo de Firmas) usan un recuadro más angosto,
   * ~40mm de ancho — ver WorkOrderPrintDocument/ClientReportFormatDocument.
   */
  widthMm?: number;
  heightMm?: number;
}

/**
 * Línea de firma de quien EMITE el documento (cuenta de cobro, informe
 * técnico, cotización) o, con Firmas en sitio, de cualquier firmante
 * (técnico o quien recibe). El nombre y documento/cargo del firmante van
 * DEBAJO, como hermano de este componente en cada documento — nunca
 * cambian.
 *
 * La imagen se ancla al fondo de su propia caja (object-bottom), y esa
 * caja se posiciona `SIGNATURE_LINE_GAP_MM` por ENCIMA del renglón (nunca
 * tocándolo ni cruzándolo). El contenedor reserva exactamente esa altura
 * — heightMm + el margen — así que, sin importar qué tan ancha o alta sea
 * la rúbrica real, la caja de la imagen queda contenida por completo
 * dentro del espacio reservado: no invade el contenido de arriba ni el
 * nombre/cargo que sigue debajo.
 */
export function SignatureLine({
  signatureImageUrl,
  widthMm = 50,
  heightMm = 22,
}: SignatureLineProps) {
  return (
    <div
      className={cn(
        "relative border-b border-neutral-400",
        !signatureImageUrl && "h-10",
      )}
      style={
        signatureImageUrl
          ? { height: `${heightMm + SIGNATURE_LINE_GAP_MM}mm` }
          : undefined
      }
    >
      {signatureImageUrl && (
        <div
          className="pointer-events-none absolute left-0"
          style={{
            width: `${widthMm}mm`,
            height: `${heightMm}mm`,
            bottom: `${SIGNATURE_LINE_GAP_MM}mm`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- firma remota en Cloudinary, sin dominio fijo que declarar */}
          <img
            src={cloudinaryUrl(signatureImageUrl, "signature")}
            alt="Firma"
            className="h-full w-full object-contain object-bottom"
          />
        </div>
      )}
    </div>
  );
}
