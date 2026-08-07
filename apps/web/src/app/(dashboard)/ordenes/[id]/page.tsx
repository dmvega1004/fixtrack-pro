import { notFound } from "next/navigation";
import Link from "next/link";
import { Printer } from "lucide-react";
import { getSession } from "@/lib/session";
import { getWorkOrder } from "@/lib/api/work-orders";
import { getWorkOrderParts } from "@/lib/api/work-order-parts";
import { getSpareParts } from "@/lib/api/spare-parts";
import { getTechnicians } from "@/lib/api/users";
import { getPhotos } from "@/lib/api/attachments";
import { getCompany } from "@/lib/api/company";
import { HttpError } from "@/lib/api/http";
import { StatusChip } from "@/components/shared/status-chip";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";
import { OrderTabs } from "@/components/work-orders/order-tabs";
import { OrderStatusChanger } from "@/components/work-orders/order-status-changer";
import { DetailsTab } from "@/components/work-orders/details-tab";
import { PartsTab } from "@/components/work-orders/parts-tab";
import { PhotosTab } from "@/components/work-orders/photos-tab";

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

  const [partsSummary, technicians, catalog, photos, company] = await Promise.all([
    getWorkOrderParts(id),
    canManage ? getTechnicians() : Promise.resolve([]),
    isTerminal ? Promise.resolve([]) : getSpareParts(),
    getPhotos(id),
    getCompany(),
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
          </div>
          <Link
            href={`/ordenes/${order.id}/imprimir`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Printer className="size-4" />
            Imprimir orden
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(order.createdAt)}
        </p>
        <p className="line-clamp-2 text-sm">{order.description}</p>

        <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-4 text-sm">
          {order.equipment ? (
            <>
              <span className="font-medium">
                {order.equipment.brand} {order.equipment.model}
              </span>
              <span className="text-muted-foreground">{order.client.name}</span>
              {order.equipment.location && (
                <span className="text-xs text-muted-foreground">
                  {order.equipment.location}
                </span>
              )}
              <span className="mt-1 text-xs text-muted-foreground">
                Código QR: {order.equipment.qrCode}
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">{order.client.name}</span>
              <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Servicio locativo
              </span>
            </>
          )}
        </div>
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
            technicians={technicians}
            isTerminal={isTerminal}
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
          />
        }
        fotos={
          <PhotosTab
            orderId={order.id}
            initialPhotos={photos}
            isTerminal={isTerminal}
          />
        }
        historial={
          <div className="p-4 text-sm text-muted-foreground md:p-6">
            Bitácora de actividad — próximamente
          </div>
        }
      />
    </div>
  );
}
