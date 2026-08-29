import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getWorkOrderParts } from "@/lib/api/work-order-parts";
import { getClient } from "@/lib/api/clients";
import { getCompany } from "@/lib/api/company";
import { HttpError } from "@/lib/api/http";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { CollectionDocument } from "@/components/billing/print/collection-document";
import { PrintActions } from "@/components/work-orders/print/print-actions";

interface CuentaDeCobroPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Igual que /ordenes/[id]/imprimir: getWorkOrder está envuelto en cache()
 * de React, así que esta llamada y la de la página se deduplican en una
 * sola petición al backend dentro del mismo render.
 */
export async function generateMetadata({
  params,
}: CuentaDeCobroPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const order = await getWorkOrder(id);
    if (order.collectionNumber == null) {
      return { title: "Cuenta de cobro" };
    }
    return {
      title: `Cuenta de cobro ${formatCollectionNumber(order.collectionNumber)} - ${order.client.name}`,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      return { title: "Cuenta de cobro" };
    }
    throw error;
  }
}

/**
 * Fuera del grupo (dashboard): no hereda el layout con AppShell, pero por
 * eso repite acá la misma protección de sesión que aplica DashboardLayout
 * para el resto de rutas del panel — mismo patrón que /imprimir. La cuenta
 * de cobro es un documento financiero: el TECHNICIAN se redirige acá,
 * mismo patrón que /cotizaciones/[id]/documento (RBAC financiero — un
 * técnico no tiene por qué ver el total cobrado al cliente).
 */
export default async function CuentaDeCobroPage({
  params,
}: CuentaDeCobroPageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role === "TECHNICIAN") {
    redirect("/");
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

  // Sin cuenta de cobro generada todavía: no hay documento que mostrar
  // (la generación es un paso ADMIN aparte, ver botón en el detalle de orden).
  if (order.collectionNumber == null) {
    notFound();
  }

  const [client, company, partsSummary] = await Promise.all([
    getClient(order.client.id),
    getCompany(),
    getWorkOrderParts(id),
  ]);

  return (
    <div className="min-h-svh bg-neutral-100 pb-24 print:bg-white print:pb-0">
      <CollectionDocument
        order={order}
        equipments={order.equipments}
        client={client}
        company={company}
        partsSummary={partsSummary}
      />
      <PrintActions orderId={order.id} />
    </div>
  );
}
