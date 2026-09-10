import type { Equipment } from "@/lib/api/equipments";
import type { Company } from "@/lib/api/company";
import { QrCodeImage } from "./qr-code-image";

interface EquipmentLabelDocumentProps {
  equipment: Equipment;
  company: Company;
}

/**
 * Tarjeta de 70×45mm en unidades mm (no px): así el tamaño impreso es
 * exacto sin importar el viewport, igual que WorkOrderPrintDocument fija su
 * ancho en mm para el documento de orden.
 *
 * El texto NO se trunca: cada campo fluye a los renglones que necesite
 * (`break-words` parte incluso un serial sin separadores antes que
 * desbordar de lado). El QR mantiene su recuadro de 32mm intacto — es lo
 * único que un técnico escanea a 30cm con mala luz — y la letra se
 * dimensiona para que el caso real más largo (un motor con nombre
 * descriptivo + razón social completa + serial) quepa dentro de los 45mm.
 * La altura es `minHeight`, no fija: si alguien registra un texto
 * absurdamente largo, la etiqueta crece hacia abajo con su borde punteado
 * antes que recortar el serial o la referencia, que son los que
 * identifican la pieza.
 */
export function EquipmentLabelDocument({
  equipment,
  company,
}: EquipmentLabelDocumentProps) {
  const reference = equipment.qrCode.slice(0, 8).toUpperCase();

  return (
    <div
      id="equipment-label-card"
      className="flex items-center gap-2.5 rounded-md border-2 border-dashed border-neutral-400 bg-white p-2.5 text-neutral-900 print:border-neutral-500"
      style={{ width: "70mm", minHeight: "45mm" }}
    >
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: "32mm", height: "32mm" }}
      >
        <QrCodeImage
          value={equipment.qrCode}
          size={200}
          className="h-full w-full"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 leading-tight">
        <span className="text-[10px] font-bold break-words">{company.name}</span>
        <span className="text-[9px] font-medium break-words">
          {equipment.brand} {equipment.model}
        </span>
        <span className="text-[8px] break-words text-neutral-600">
          Serial: {equipment.serialNumber ?? "—"}
        </span>
        <span className="text-[8px] font-mono break-words text-neutral-600">
          Ref: {reference}
        </span>
      </div>
    </div>
  );
}
