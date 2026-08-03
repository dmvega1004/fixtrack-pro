"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteClientAction } from "@/app/(dashboard)/clientes/actions";

interface DeleteClientButtonProps {
  clientId: string;
  clientName: string;
}

export function DeleteClientButton({ clientId, clientName }: DeleteClientButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar al cliente "${clientName}"?`)) return;

    setIsDeleting(true);
    const result = await deleteClientAction(clientId);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo eliminar el cliente");
      return;
    }

    toast.success("Cliente eliminado");
    router.push("/clientes");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={() => void handleDelete()}
      disabled={isDeleting}
    >
      {isDeleting ? "Eliminando..." : "Eliminar cliente"}
    </Button>
  );
}
