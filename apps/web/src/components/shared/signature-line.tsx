import { cloudinaryUrl } from "@/lib/image/cloudinary-url";

interface SignatureLineProps {
  /**
   * URL de Cloudinary de la firma a estampar. `null`/`undefined` (sin
   * imagen cargada, o el documento tiene la casilla desactivada) deja la
   * línea exactamente como hoy — sin huecos ni espacio reservado de más.
   */
  signatureImageUrl?: string | null;
}

/**
 * Línea de firma de quien EMITE el documento (cuenta de cobro, informe
 * técnico, cotización). El nombre y cargo del firmante van DEBAJO, como
 * hermano de este componente en cada documento — nunca cambian.
 *
 * La imagen se ancla al fondo de la línea, por ENCIMA de ella (position
 * absolute, fuera del flujo): el trazo queda "sobre" el renglón como una
 * firma real, sin empujar el nombre/cargo que sigue.
 */
export function SignatureLine({ signatureImageUrl }: SignatureLineProps) {
  return (
    <div className="relative h-10 border-b border-neutral-400">
      {signatureImageUrl && (
        <div
          className="pointer-events-none absolute bottom-0 left-0"
          style={{ width: "50mm", height: "22mm" }}
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
