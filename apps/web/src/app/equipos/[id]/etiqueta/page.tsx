import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEquipment } from "@/lib/api/equipments";
import { getCompany } from "@/lib/api/company";
import { HttpError } from "@/lib/api/http";
import { EquipmentLabelDocument } from "@/components/equipment/equipment-label-document";
import { PrintLabelActions } from "@/components/equipment/print-label-actions";

interface EtiquetaEquipoPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EtiquetaEquipoPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const equipment = await getEquipment(id);
    return {
      title: `Etiqueta - ${equipment.brand} ${equipment.model}`,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      return { title: "Etiqueta de equipo" };
    }
    throw error;
  }
}

/**
 * Fuera del grupo (dashboard): sin AppShell (sin sidebar ni bottom-nav), así
 * que repite acá la misma protección de sesión que aplica DashboardLayout,
 * igual que /ordenes/[id]/imprimir.
 */
export default async function EtiquetaEquipoPage({
  params,
}: EtiquetaEquipoPageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  let equipment;
  try {
    equipment = await getEquipment(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const company = await getCompany();

  return (
    <div className="flex min-h-svh flex-col items-center bg-neutral-100 pb-24 print:bg-white print:pb-0">
      <div className="flex flex-1 items-center justify-center p-6 print:flex-none print:p-0">
        <EquipmentLabelDocument equipment={equipment} company={company} />
      </div>

      <p className="max-w-sm px-6 text-center text-sm text-muted-foreground print:hidden">
        Imprime en papel adhesivo, recorta por la línea y pégala en el
        equipo.
      </p>

      <PrintLabelActions
        equipmentId={equipment.id}
        brand={equipment.brand}
        model={equipment.model}
        qrCode={equipment.qrCode}
      />
    </div>
  );
}
