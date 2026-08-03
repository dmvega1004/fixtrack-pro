"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteEmployeeAction } from "@/app/(dashboard)/personal/actions";

interface DeleteEmployeeButtonProps {
  employeeId: string;
  employeeName: string;
}

export function DeleteEmployeeButton({ employeeId, employeeName }: DeleteEmployeeButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `¿Eliminar a "${employeeName}"? Sus órdenes asignadas quedarán sin asignar.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    const result = await deleteEmployeeAction(employeeId);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo eliminar al empleado");
      return;
    }

    toast.success("Empleado eliminado");
    router.push("/personal");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={() => void handleDelete()}
      disabled={isDeleting}
    >
      {isDeleting ? "Eliminando..." : "Eliminar empleado"}
    </Button>
  );
}
