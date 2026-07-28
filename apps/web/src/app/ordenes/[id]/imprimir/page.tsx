import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getWorkOrderParts } from "@/lib/api/work-order-parts";
import { getEquipment } from "@/lib/api/equipments";
import { getClient } from "@/lib/api/clients";
import { getCompany } from "@/lib/api/company";
import { getPhotos } from "@/lib/api/attachments";
import { HttpError } from "@/lib/api/http";
import { WorkOrderPrintDocument } from "@/components/work-orders/print/work-order-print-document";
import { PrintActions } from "@/components/work-orders/print/print-actions";

interface ImprimirOrdenPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Fuera del grupo (dashboard): no hereda el layout con AppShell (sin
 * sidebar ni bottom-nav), pero por eso repite acá la misma protección de
 * sesión que aplica DashboardLayout para el resto de rutas del panel.
 */
export default async function ImprimirOrdenPage({
  params,
}: ImprimirOrdenPageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  let order;
  try {
    order = await getWorkOrder(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const [equipment, client, company, partsSummary, photos] = await Promise.all([
    getEquipment(order.equipmentId),
    getClient(order.equipment.client.id),
    getCompany(),
    getWorkOrderParts(id),
    getPhotos(id),
  ]);

  return (
    <div className="min-h-svh bg-neutral-100 pb-24 print:bg-white print:pb-0">
      <WorkOrderPrintDocument
        order={order}
        equipment={equipment}
        client={client}
        company={company}
        partsSummary={partsSummary}
        photos={photos}
      />
      <PrintActions orderId={order.id} />
    </div>
  );
}
