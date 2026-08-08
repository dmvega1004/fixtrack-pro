import { notFound } from "next/navigation";
import Link from "next/link";
import { Printer, Pencil, Plus } from "lucide-react";
import { getEquipment } from "@/lib/api/equipments";
import { getClient } from "@/lib/api/clients";
import { getWorkOrders } from "@/lib/api/work-orders";
import { HttpError } from "@/lib/api/http";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentStatusBadge } from "@/components/equipment/equipment-status-badge";
import { QrCodeImage } from "@/components/equipment/qr-code-image";
import { StatusChip } from "@/components/shared/status-chip";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";

interface EquipoDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function EquipoDetallePage({
  params,
}: EquipoDetallePageProps) {
  const { id } = await params;

  let equipment;
  try {
    equipment = await getEquipment(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const [client, workOrders] = await Promise.all([
    getClient(equipment.clientId),
    getWorkOrders(),
  ]);

  // El backend no filtra por equipmentId en query: se pide todo lo visible
  // para el rol actual y se filtra acá — incluye órdenes que abarcan varios
  // equipos (ej. un proyecto sobre 5 portones), no solo las de un equipo único.
  const history = workOrders
    .filter((order) => order.equipments.some((eq) => eq.id === equipment.id))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {equipment.brand} {equipment.model}
          </h1>
          <p className="text-sm text-muted-foreground">
            {equipment.serialNumber ?? "Sin número de serie"}
          </p>
        </div>
        <EquipmentStatusBadge status={equipment.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/ordenes/nueva?equipo=${equipment.id}`}
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <Plus className="size-4" />
          Nueva orden para este equipo
        </Link>
        <Link
          href={`/equipos/${equipment.id}/etiqueta`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Printer className="size-4" />
          Imprimir etiqueta
        </Link>
        <Link
          href={`/equipos/${equipment.id}/editar`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="size-4" />
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Datos del equipo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Marca" value={equipment.brand} />
            <Field label="Modelo" value={equipment.model} />
            <Field label="Serial" value={equipment.serialNumber} />
            <Field label="Ubicación" value={equipment.location} />
            <Field label="Código QR" value={equipment.qrCode} />
            <Field label="Registrado" value={formatDate(equipment.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Código QR</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <QrCodeImage value={equipment.qrCode} size={140} />
            <p className="text-center text-xs text-muted-foreground">
              Escanéalo desde la ficha impresa para llegar directo a este
              equipo.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5 sm:col-span-1">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Nombre
            </span>
            <Link
              href={`/clientes/${client.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {client.name}
            </Link>
          </div>
          <Field label="Teléfono" value={client.phone} />
          <Field label="Correo" value={client.email} />
          <Field label="Dirección" value={client.address} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este equipo no tiene órdenes de trabajo registradas.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {history.map((order) => (
                <Link
                  key={order.id}
                  href={`/ordenes/${order.id}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
                >
                  <span className="font-medium">
                    {formatOrderNumber(order.orderNumber)}
                  </span>
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
