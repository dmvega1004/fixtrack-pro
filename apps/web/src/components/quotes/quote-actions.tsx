"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, Eye, FileText, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { QuoteStatus } from "@/lib/api/quotes";
import { EmitQuoteDialog } from "./emit-quote-dialog";
import { PostponeFollowUpDialog } from "./postpone-follow-up-dialog";
import { RejectQuoteDialog } from "./reject-quote-dialog";
import { decideQuoteAction, duplicateQuoteAction } from "@/app/(dashboard)/cotizaciones/actions";

interface QuoteActionsProps {
  quoteId: string;
  status: QuoteStatus;
}

/**
 * Botones según el estado:
 * - DRAFT: Editar · Vista previa (el documento con marca de agua) · Emitir.
 * - SENT: "Ver documento" es el botón PRINCIPAL — emitir y entregar son un
 *   solo movimiento en la práctica. Debajo, decidir o duplicar.
 * - Cerrada (ACCEPTED/REJECTED): Ver documento · Duplicar.
 * La cotización enviada NUNCA muestra controles de edición acá — ese es
 * justo el punto: que el botón no exista, no un botón deshabilitado.
 */
export function QuoteActions({ quoteId, status }: QuoteActionsProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function handleAccept() {
    setIsAccepting(true);
    const result = await decideQuoteAction(quoteId, { status: "ACCEPTED" });
    setIsAccepting(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo marcar como aceptada");
      return;
    }
    toast.success("Cotización marcada como aceptada");
    router.refresh();
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    const result = await duplicateQuoteAction(quoteId);
    setIsDuplicating(false);

    if (!result.ok || !result.id) {
      toast.error(result.message ?? "No se pudo duplicar la cotización");
      return;
    }
    toast.success("Cotización duplicada como borrador nuevo");
    router.push(`/cotizaciones/${result.id}`);
  }

  if (status === "DRAFT") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/cotizaciones/${quoteId}/editar`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="size-4" />
          Editar
        </Link>
        <Link
          href={`/cotizaciones/${quoteId}/documento`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Eye className="size-4" />
          Vista previa
        </Link>
        <EmitQuoteDialog quoteId={quoteId} />
      </div>
    );
  }

  if (status === "SENT") {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/cotizaciones/${quoteId}/documento`}
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <FileText className="size-4" />
          Ver documento
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleAccept()}
          disabled={isAccepting}
        >
          <CheckCircle2 className="size-4" />
          {isAccepting ? "Guardando..." : "Marcar aceptada"}
        </Button>
        <RejectQuoteDialog quoteId={quoteId} />
        <PostponeFollowUpDialog quoteId={quoteId} />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleDuplicate()}
          disabled={isDuplicating}
        >
          <Copy className="size-4" />
          {isDuplicating ? "Duplicando..." : "Duplicar"}
        </Button>
      </div>
    );
  }

  // ACCEPTED / REJECTED — cerrada.
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/cotizaciones/${quoteId}/documento`}
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <FileText className="size-4" />
        Ver documento
      </Link>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void handleDuplicate()}
        disabled={isDuplicating}
      >
        <Copy className="size-4" />
        {isDuplicating ? "Duplicando..." : "Duplicar"}
      </Button>
    </div>
  );
}
