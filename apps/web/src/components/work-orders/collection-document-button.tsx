"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { generateCollectionDocumentAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface CollectionDocumentButtonProps {
  orderId: string;
  /**
   * Este botón solo lo monta ADMIN (candado en el componente padre), pero
   * el tipo es opcional porque viene de WorkOrder.collectionNumber,
   * redactado para TECHNICIAN.
   */
  collectionNumber?: number | null;
  /** Título configurado de la empresa (ej. "Cuenta de cobro") para el label del botón. */
  docTitle: string;
}

/**
 * Solo se renderiza para ADMIN y en órdenes cerradas (candado en el
 * componente padre y en el backend). Si ya existe el documento, es un
 * simple Link — no vuelve a golpear el backend para "generar" de nuevo.
 */
export function CollectionDocumentButton({
  orderId,
  collectionNumber,
  docTitle,
}: CollectionDocumentButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);

  if (collectionNumber != null) {
    return (
      <Link
        href={`/ordenes/${orderId}/cuenta-de-cobro`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <FileText className="size-4" />
        Ver cuenta de cobro {formatCollectionNumber(collectionNumber)}
      </Link>
    );
  }

  async function handleGenerate() {
    setIsGenerating(true);
    const result = await generateCollectionDocumentAction(orderId);
    setIsGenerating(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo generar el documento");
      return;
    }

    router.push(`/ordenes/${orderId}/cuenta-de-cobro`);
  }

  return (
    <button
      type="button"
      onClick={() => void handleGenerate()}
      disabled={isGenerating}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <FileText className="size-4" />
      {isGenerating ? "Generando..." : `Generar ${docTitle.toLowerCase()}`}
    </button>
  );
}
