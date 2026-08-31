import { notFound } from "next/navigation";
import Link from "next/link";
import { Printer } from "lucide-react";
import { getSession } from "@/lib/session";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getClient } from "@/lib/api/clients";
import { getWorkOrderParts } from "@/lib/api/work-order-parts";
import { getSpareParts } from "@/lib/api/spare-parts";
import { getMyProfile, getTechnicians } from "@/lib/api/users";
import { getEquipments } from "@/lib/api/equipments";
import { getPhotos } from "@/lib/api/attachments";
import { getCompany } from "@/lib/api/company";
import { getWorkOrderPayments } from "@/lib/api/payments";
import { getRetentions } from "@/lib/api/retentions";
import { getActivityLog } from "@/lib/api/activity-log";
import { HttpError } from "@/lib/api/http";
import { StatusChip } from "@/components/shared/status-chip";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ServiceTypeBadge } from "@/components/shared/service-type-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";
import { OrderTabs } from "@/components/work-orders/order-tabs";
import { OrderStatusChanger } from "@/components/work-orders/order-status-changer";
import { DetailsTab } from "@/components/work-orders/details-tab";
import { PartsTab } from "@/components/work-orders/parts-tab";
import { PhotosTab } from "@/components/work-orders/photos-tab";
import { ActivityTab } from "@/components/work-orders/activity-tab";
import { EquipmentSection } from "@/components/work-orders/equipment-section";
import { CollectionDocumentButton } from "@/components/work-orders/collection-document-button";

const TERMINAL_STATUSES = ["DELIVERED", "CANCELLED"];

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrdenDetallePage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    notFound();
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

  const canManage = session.role === "ADMIN" || session.role === "COORDINATOR";
  const isAdmin = session.role === "ADMIN";
  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const isClosed = order.status === "COMPLETED" || order.status === "DELIVERED";

  const [
    partsSummary,
    technicians,
    catalog,
    photos,
    company,
    client,
    clientEquipments,
    payments,
    activityLog,
    retentionCatalog,
    myProfile,
  ] = await Promise.all([
    getWorkOrderParts(id),
    canManage ? getTechnicians() : Promise.resolve([]),
    isTerminal ? Promise.resolve([]) : getSpareParts(),
    getPhotos(id),
    getCompany(),
    getClient(order.clientId),
    canManage ? getEquipments({ clientId: order.clientId }) : Promise.resolve([]),
    isAdmin && isClosed ? getWorkOrderPayments(id) : Promise.resolve([]),
    getActivityLog(id),
    // getRetentions() es ADMIN-only en el backend — solo se pide si el rol
    // efectivamente puede editar el bloque de retenciones (ver RetentionsSection).
    isAdmin ? getRetentions() : Promise.resolve([]),
    // Los tres roles: el bloque "Firmas" necesita SU firma de perfil
    // (SignaturesSection) — el administrador y el coordinador también
    // firman órdenes.
    getMyProfile(),
  ]);

  return (
    <div className="flex flex-1 flex-col pb-36 md:pb-6">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold md:text-3xl">
              {formatOrderNumber(order.orderNumber)}
            </h1>
            <StatusChip status={order.status} />
            <PriorityBadge priority={order.priority} />
            <ServiceTypeBadge serviceType={order.serviceType} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/ordenes/${order.id}/imprimir`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Printer className="size-4" />
              Imprimir orden
            </Link>
            {client.reportFormatEnabled && (
              <Link
                href={`/ordenes/${order.id}/formato-cliente`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Printer className="size-4" />
                Imprimir formato del cliente
              </Link>
            )}
            {isAdmin && isClosed && (
              <CollectionDocumentButton
                orderId={order.id}
                collectionNumber={order.collectionNumber}
                docTitle={company.collectionDocTitle}
              />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(order.createdAt)}
        </p>
        <p className="line-clamp-2 text-sm">{order.description}</p>

        <EquipmentSection
          orderId={order.id}
          clientName={order.client.name}
          equipments={order.equipments}
          clientEquipments={clientEquipments}
          canManage={canManage}
          isTerminal={isTerminal}
        />
      </div>

      <OrderStatusChanger
        orderId={order.id}
        currentStatus={order.status}
        isTerminal={isTerminal}
      />

      <OrderTabs
        detalles={
          <DetailsTab
            order={order}
            canManage={canManage}
            isAdmin={isAdmin}
            technicians={technicians}
            isTerminal={isTerminal}
            myProfile={myProfile}
          />
        }
        repuestos={
          <PartsTab
            orderId={order.id}
            summary={partsSummary}
            catalog={catalog}
            isTerminal={isTerminal}
            currency={company.currency}
            isAdmin={isAdmin}
            isClosed={isClosed}
            payments={payments}
            collectionNumber={order.collectionNumber}
            retentionCatalog={retentionCatalog}
          />
        }
        fotos={
          <PhotosTab
            orderId={order.id}
            initialPhotos={photos}
            isTerminal={isTerminal}
          />
        }
        historial={<ActivityTab entries={activityLog} />}
      />
    </div>
  );
}
