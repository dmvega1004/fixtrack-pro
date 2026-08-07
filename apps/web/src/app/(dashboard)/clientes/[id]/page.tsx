import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getClient } from "@/lib/api/clients";
import { getEquipments } from "@/lib/api/equipments";
import { getWorkOrders } from "@/lib/api/work-orders";
import { HttpError } from "@/lib/api/http";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentStatusBadge } from "@/components/equipment/equipment-status-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";

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

  const [equipments, workOrders] = await Promise.all([getEquipments(), getWorkOrders()]);

  const clientEquipments = equipments.filter((equipment) => equipment.clientId === client.id);

  // El backend no filtra por clientId en query: se pide todo lo visible para
  // el rol actual y se filtra acá, igual que en la ficha de equipo. Incluye
  // órdenes sin equipo (servicios locativos): clientId es el vínculo directo.
  const history = workOrders
    .filter((order) => order.clientId === client.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const documentLabel =
    client.documentType && client.documentNumber
      ? `${DOCUMENT_TYPE_LABELS[client.documentType as DocumentType]}: ${client.documentNumber}`
      : null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {documentLabel ?? client.phone ?? "Sin datos de contacto"}
          </p>
        </div>
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
              {history.map((order) => (
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
                      {order.equipment
                        ? `${order.equipment.brand} ${order.equipment.model}`
                        : "Servicio locativo"}
                    </span>
                  </div>
                  <span className="flex items-center gap-3">
                    <StatusChip status={order.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </span>
                </Link>
              ))}
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
