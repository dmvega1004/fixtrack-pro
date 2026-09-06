"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/components/shared/status-chip";
import { changeStatusAction, type ActionResult } from "@/app/(dashboard)/ordenes/[id]/actions";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { enqueueWorkOrderStatus } from "@/lib/queue/producers";

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

interface OrderStatusChangerProps {
  orderId: string;
  userId: string;
  currentStatus: OrderStatus;
  isTerminal: boolean;
}

/** Etapa 2-C: sin señal, encola el cambio en vez de llamar la Server Action de siempre — ver description-editor.tsx. */
export function OrderStatusChanger({
  orderId,
  userId,
  currentStatus,
  isTerminal,
}: OrderStatusChangerProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [selected, setSelected] = useState<OrderStatus>(currentStatus);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelected(event.target.value as OrderStatus);
  }

  async function handleSave() {
    if (selected === currentStatus) return;

    setIsSaving(true);
    let result: ActionResult;
    if (isOnline) {
      result = await changeStatusAction(orderId, selected);
    } else {
      await enqueueWorkOrderStatus(orderId, userId, selected);
      result = { ok: true };
    }
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo cambiar el estado");
      setSelected(currentStatus);
      return;
    }

    toast.success("Estado actualizado");
    // Sin señal, la vista offline se actualiza sola (ver hooks/use-synced-order.ts)
    // — un router.refresh() acá solo dispararía una petición RSC condenada
    // a fallar por falta de señal.
    if (isOnline) router.refresh();
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
