import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getWorkOrderParts } from "@/lib/api/work-order-parts";
import { getClient } from "@/lib/api/clients";
import { getCompany } from "@/lib/api/company";
import { getPhotos } from "@/lib/api/attachments";
import { HttpError } from "@/lib/api/http";
import { formatOrderNumber } from "@/lib/format/order-number";
import { WorkOrderPrintDocument } from "@/components/work-orders/print/work-order-print-document";
import { PrintActions } from "@/components/work-orders/print/print-actions";

interface ImprimirOrdenPageProps {
  params: Promise<{ id: string }>;
}

/**
 * El título del documento es lo que Chrome sugiere como nombre de archivo
 * al "Guardar como PDF". getWorkOrder está envuelto en cache() de React,
 * así que esta llamada y la de la página de abajo se deduplican en una
 * sola petición al backend dentro del mismo render.
 */
export async function generateMetadata({
  params,
}: ImprimirOrdenPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const order = await getWorkOrder(id);
    return {
      title: `${formatOrderNumber(order.orderNumber)} - ${order.client.name}`,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      return { title: "Orden de trabajo" };
    }
    throw error;
  }
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

  const [client, company, partsSummary, photos] = await Promise.all([
    getClient(order.client.id),
    getCompany(),
    getWorkOrderParts(id),
    getPhotos(id),
  ]);

  return (
    <div className="min-h-svh bg-neutral-100 pb-24 print:bg-white print:pb-0">
      <WorkOrderPrintDocument
        order={order}
        equipments={order.equipments}
        client={client}
        company={company}
        partsSummary={partsSummary}
        photos={photos}
      />
      <PrintActions orderId={order.id} />
    </div>
  );
}
