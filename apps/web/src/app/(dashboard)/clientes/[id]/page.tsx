import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { getClient } from "@/lib/api/clients";
import { getEquipments } from "@/lib/api/equipments";
import { getWorkOrders } from "@/lib/api/work-orders";
import { getWorkOrderParts } from "@/lib/api/work-order-parts";
import { getClientBalances } from "@/lib/api/billing";
import { getCompany } from "@/lib/api/company";
import { HttpError } from "@/lib/api/http";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentStatusBadge } from "@/components/equipment/equipment-status-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { PaymentStatusChip } from "@/components/shared/payment-status-chip";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatEquipmentSummary } from "@/lib/format/equipment-summary";
import { formatDate } from "@/lib/format/dates";
import { formatCurrency } from "@/lib/format/currency";

interface ClienteDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetallePage({ params }: ClienteDetallePageProps) {
  const { id } = await params;

  let client;
  try {
    client = await getClient(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const [session, equipments, workOrders] = await Promise.all([
    getSession(),
    getEquipments(),
    getWorkOrders(),
  ]);
  const isAdmin = session?.role === "ADMIN";

  const clientEquipments = equipments.filter((equipment) => equipment.clientId === client.id);

  // El backend no filtra por clientId en query: se pide todo lo visible para
  // el rol actual y se filtra acá, igual que en la ficha de equipo. Incluye
  // órdenes sin equipo (servicios locativos): clientId es el vínculo directo.
  const history = workOrders
    .filter((order) => order.clientId === client.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Valorización: las órdenes cerradas ya traen totalAmount congelado; las
  // abiertas no, así que para mostrar un valor "estimado" en el historial
  // hay que pedir su cierre económico en vivo. Se acota a las abiertas de
  // ESTE cliente (normalmente pocas) para no golpear el backend por cada
  // orden del historial completo.
  const openOrders = isAdmin ? history.filter((order) => order.totalAmount === null) : [];
  const [company, clientBalances, openBillings] = await Promise.all([
    isAdmin ? getCompany() : Promise.resolve(null),
    isAdmin ? getClientBalances() : Promise.resolve([]),
    Promise.all(openOrders.map((order) => getWorkOrderParts(order.id))),
  ]);
  const estimatedValueByOrderId = new Map(
    openOrders.map((order, index) => [order.id, openBillings[index].billing.total]),
  );

  const totalBilledHistoric = history
    .filter((order) => order.totalAmount !== null)
    .reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const pendingBalance = Number(
    clientBalances.find((entry) => entry.clientId === client.id)?.balance ?? 0,
  );

  const documentLabel =
    client.documentType && client.documentNumber
      ? `${DOCUMENT_TYPE_LABELS[client.documentType as DocumentType]}: ${client.documentNumber}`
      : null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {documentLabel ?? client.phone ?? "Sin datos de contacto"}
          </p>
        </div>
        {isAdmin && company && (
          <div className="flex gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground uppercase">
                Facturado histórico
              </span>
              <span className="font-semibold">
                {formatCurrency(totalBilledHistoric, company.currency)}
              </span>
            </div>
            {pendingBalance > 0 && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase">
                  Saldo pendiente
                </span>
                <span className="font-semibold text-amber-700">
                  {formatCurrency(pendingBalance, company.currency)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/equipos/nuevo?cliente=${client.id}`}
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <Plus className="size-4" />
          Nuevo equipo para este cliente
        </Link>
        <Link
          href={`/clientes/${client.id}/editar`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="size-4" />
          Editar
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Nombre" value={client.name} />
          <Field
            label="Documento"
            value={
              client.documentType && client.documentNumber
                ? `${client.documentType} ${client.documentNumber}`
                : null
            }
          />
          <Field label="Teléfono" value={client.phone} />
          <Field label="Correo" value={client.email} />
          <Field label="Dirección" value={client.address} />
          <Field label="Días de crédito" value={`${client.paymentTermDays} días`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipos del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {clientEquipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este cliente no tiene equipos registrados.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clientEquipments.map((equipment) => (
                <Link
                  key={equipment.id}
                  href={`/equipos/${equipment.id}`}
                  className="flex flex-col gap-1 rounded-lg border border-border p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {equipment.brand} {equipment.model}
                    </span>
                    <EquipmentStatusBadge status={equipment.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {equipment.serialNumber ?? "Sin número de serie"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este cliente no tiene órdenes de trabajo registradas.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {history.map((order) => {
                const value = order.totalAmount ?? estimatedValueByOrderId.get(order.id);
                const isEstimated = order.totalAmount === null;

                return (
                  <Link
                    key={order.id}
                    href={`/ordenes/${order.id}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {formatOrderNumber(order.orderNumber)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatEquipmentSummary(order.equipments)}
                      </span>
                    </div>
                    <span className="flex items-center gap-3">
                      {isAdmin && company && value !== undefined && (
                        <span className="flex flex-col items-end">
                          <span className="text-sm font-medium">
                            {formatCurrency(value, company.currency)}
                          </span>
                          {isEstimated && (
                            <span className="text-[10px] text-muted-foreground italic">
                              estimado
                            </span>
                          )}
                        </span>
                      )}
                      {isAdmin && <PaymentStatusChip status={order.paymentStatus} />}
                      <StatusChip status={order.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm break-words">{value || "—"}</span>
    </div>
  );
}
