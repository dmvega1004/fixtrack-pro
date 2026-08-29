import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getClient } from "@/lib/api/clients";
import { getPhotos } from "@/lib/api/attachments";
import { HttpError } from "@/lib/api/http";
import {
  ClientReportFormatDocument,
  clientReportFormatFileTitle,
} from "@/components/work-orders/print/client-report-format-document";
import { PrintActions } from "@/components/work-orders/print/print-actions";

interface FormatoClientePageProps {
  params: Promise<{ id: string }>;
}

/**
 * getWorkOrder está envuelto en cache() de React, así que esta llamada y la
 * de la página se deduplican en una sola petición al backend dentro del
 * mismo render — mismo patrón que /ordenes/[id]/imprimir.
 */
export async function generateMetadata({
  params,
}: FormatoClientePageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const order = await getWorkOrder(id);
    return { title: clientReportFormatFileTitle(order) };
  } catch (error) {
    if (error instanceof HttpError) {
      return { title: "Formato del cliente" };
    }
    throw error;
  }
}

/**
 * Fuera del grupo (dashboard): no hereda el layout con AppShell, pero por
 * eso repite acá la misma protección de sesión que aplica DashboardLayout
 * para el resto de rutas del panel — mismo patrón que /imprimir. Sin
 * restricción de rol adicional: quien puede ver la orden (getWorkOrder ya
 * aplica esa visibilidad) puede imprimir cualquiera de sus documentos,
 * igual que el informe técnico.
 */
export default async function FormatoClientePage({
  params,
}: FormatoClientePageProps) {
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

  // En paralelo, no en cadena: ninguno de los dos depende del otro (mismo
  // patrón que /ordenes/[id]/imprimir) — encadenarlos triplicaría el tiempo
  // de carga en una red lenta.
  const [client, photos] = await Promise.all([
    getClient(order.client.id),
    getPhotos(id),
  ]);

  // Candado adicional: si el formato no está activo para este cliente (ya
  // sea porque nunca se configuró o se desactivó después de que alguien
  // guardó el enlace), no hay documento que mostrar.
  if (!client.reportFormatEnabled) {
    notFound();
  }

  return (
    <div className="min-h-svh bg-neutral-100 pb-24 print:bg-white print:pb-0">
      <ClientReportFormatDocument order={order} client={client} photos={photos} />
      <PrintActions orderId={order.id} />
    </div>
  );
}
