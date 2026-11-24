"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/components/shared/status-chip";
import { changeStatusAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { enqueueWorkOrderStatus } from "@/lib/queue/producers";
import { saveDirectOrEnqueue, type SaveOutcome } from "@/lib/queue/save-direct-or-enqueue";

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

interface OrderStatusChangerProps {
  orderId: string;
  /** Solo para la pantalla de estado de la cola (ver lib/queue/producers.ts). */
  orderNumber: number;
  userId: string;
  currentStatus: OrderStatus;
  isTerminal: boolean;
}

/** Sin señal, o si la red falla al guardar, encola el cambio — ver lib/queue/save-direct-or-enqueue.ts. */
export function OrderStatusChanger({
  orderId,
  orderNumber,
  userId,
  currentStatus,
  isTerminal,
}: OrderStatusChangerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<OrderStatus>(currentStatus);
  const [isSaving, setIsSaving] = useState(false);

  // Mismo ajuste que LongTextFieldEditor (ver ese archivo): `currentStatus`
  // puede llegar desactualizado en el primer render y corregirse un
  // instante después (mezcla de cambios pendientes async) — sin esto, un
  // cambio de estado ya encolado y guardado no se refleja al recargar.
  const [syncedStatus, setSyncedStatus] = useState(currentStatus);
  if (currentStatus !== syncedStatus && selected === syncedStatus) {
    setSyncedStatus(currentStatus);
    setSelected(currentStatus);
  }

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelected(event.target.value as OrderStatus);
  }

  async function handleSave() {
    if (selected === currentStatus) return;

    setIsSaving(true);
    let result: SaveOutcome;
    try {
      result = await saveDirectOrEnqueue({
        userId,
        orderId,
        direct: () => changeStatusAction(orderId, selected),
        enqueue: () => enqueueWorkOrderStatus({ id: orderId, orderNumber }, userId, selected),
      });
    } catch (error) {
      // Solo si no se pudo ni encolar (ver LongTextFieldEditor) — el
      // botón vuelve para poder reintentar.
      console.error("[guardar] no se pudo cambiar el estado ni encolarlo", error);
      toast.error("No se pudo cambiar el estado");
      return;
    } finally {
      setIsSaving(false);
    }

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo cambiar el estado");
      setSelected(currentStatus);
      return;
    }

    toast.success("Estado actualizado");
    // Si quedó en la cola, la vista offline se actualiza sola (ver
    // hooks/use-synced-order.ts) — un router.refresh() acá solo dispararía
    // una petición RSC condenada a fallar por falta de señal.
    if (!result.queued) router.refresh();
  }

  if (isTerminal) {
    return (
      <div className="border-b border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground md:mx-6 md:mt-4 md:rounded-lg md:border">
        Orden cerrada — no admite cambios
      </div>
    );
  }

  const control = (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={handleChange}
        aria-label="Cambiar estado"
        className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground md:flex-none"
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <Button
        onClick={() => void handleSave()}
        disabled={isSaving || selected === currentStatus}
      >
        {isSaving ? "Guardando..." : "Cambiar estado"}
      </Button>
    </div>
  );

  return (
    <>
      <div className="hidden border-b border-border p-4 md:block md:mx-2 md:mt-4 md:rounded-lg md:border md:bg-card">
        {control}
      </div>
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card p-3 md:hidden">
        {control}
      </div>
    </>
  );
}
