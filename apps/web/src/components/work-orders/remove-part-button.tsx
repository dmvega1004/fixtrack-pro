"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removePartAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface RemovePartButtonProps {
  orderId: string;
  sparePartId: string;
  partName: string;
}

export function RemovePartButton({
  orderId,
  sparePartId,
  partName,
}: RemovePartButtonProps) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove() {
    if (!window.confirm(`¿Quitar "${partName}" de esta orden?`)) return;

    setIsRemoving(true);
    const result = await removePartAction(orderId, sparePartId);
    setIsRemoving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo quitar el repuesto");
      return;
    }

    toast.success("Repuesto eliminado");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void handleRemove()}
      disabled={isRemoving}
    >
      {isRemoving ? "Quitando..." : "Quitar"}
    </Button>
  );
}
