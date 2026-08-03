"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteSparePartAction } from "@/app/(dashboard)/inventario/actions";

interface DeleteSparePartButtonProps {
  sparePartId: string;
  partName: string;
}

export function DeleteSparePartButton({
  sparePartId,
  partName,
}: DeleteSparePartButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar el repuesto "${partName}"?`)) return;

    setIsDeleting(true);
    const result = await deleteSparePartAction(sparePartId);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo eliminar el repuesto");
      return;
    }

    toast.success("Repuesto eliminado");
    router.push("/inventario");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={() => void handleDelete()}
      disabled={isDeleting}
    >
      {isDeleting ? "Eliminando..." : "Eliminar repuesto"}
    </Button>
  );
}
