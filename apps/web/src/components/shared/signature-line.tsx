import { cloudinaryUrl } from "@/lib/image/cloudinary-url";

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
 * La imagen se ancla al fondo de la línea, por ENCIMA de ella (position
 * absolute, fuera del flujo): el trazo queda "sobre" el renglón como una
 * firma real, sin empujar el nombre/cargo que sigue.
 */
export function SignatureLine({
  signatureImageUrl,
  widthMm = 50,
  heightMm = 22,
}: SignatureLineProps) {
  return (
    <div className="relative h-10 border-b border-neutral-400">
      {signatureImageUrl && (
        <div
          className="pointer-events-none absolute bottom-0 left-0"
          style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
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
