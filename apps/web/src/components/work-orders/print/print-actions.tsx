"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintActionsProps {
  orderId: string;
}

export function PrintActions({ orderId }: PrintActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 border-t border-border bg-card p-3 print:hidden">
      <Link
        href={`/ordenes/${orderId}`}
        className="inline-flex h-9 flex-1 max-w-40 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <Button
        type="button"
        onClick={() => window.print()}
        className="max-w-64 flex-1 gap-1.5"
      >
        <Printer className="size-4" />
        Imprimir / Guardar PDF
      </Button>
    </div>
  );
}
