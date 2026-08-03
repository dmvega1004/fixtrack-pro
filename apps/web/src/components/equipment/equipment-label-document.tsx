import type { Equipment } from "@/lib/api/equipments";
import type { Company } from "@/lib/api/company";
import { QrCodeImage } from "./qr-code-image";

interface EquipmentLabelDocumentProps {
  equipment: Equipment;
  company: Company;
}

/**
 * Tarjeta de ~70×45mm en unidades mm (no px): así el tamaño impreso es
 * exacto sin importar el viewport, igual que WorkOrderPrintDocument fija su
 * ancho en mm para el documento de orden.
 */
export function EquipmentLabelDocument({
  equipment,
  company,
}: EquipmentLabelDocumentProps) {
  const reference = equipment.qrCode.slice(0, 8).toUpperCase();

  return (
    <div
      id="equipment-label-card"
      className="flex items-center gap-3 rounded-md border-2 border-dashed border-neutral-400 bg-white p-3 text-neutral-900 print:border-neutral-500"
      style={{ width: "70mm", height: "45mm" }}
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
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-bold">{company.name}</span>
        <span className="truncate text-xs font-medium">
          {equipment.brand} {equipment.model}
        </span>
        <span className="truncate text-[11px] text-neutral-600">
          Serial: {equipment.serialNumber ?? "—"}
        </span>
        <span className="truncate text-[11px] font-mono text-neutral-600">
          Ref: {reference}
        </span>
      </div>
    </div>
  );
}
