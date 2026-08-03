"use client";

import { useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { ArrowLeft, Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintLabelActionsProps {
  equipmentId: string;
  brand: string;
  model: string;
  qrCode: string;
}

function slugifyForFilename(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
}

export function PrintLabelActions({
  equipmentId,
  brand,
  model,
  qrCode,
}: PrintLabelActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    const node = document.getElementById("equipment-label-card");
    if (!node) return;

    setIsDownloading(true);
    try {
      // PNG obligatorio: JPG comprime con pérdida y degrada los módulos del
      // QR hasta hacerlo ilegible. pixelRatio 3 para que quede nítido incluso
      // impreso en papel adhesivo pequeño.
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });

      const reference = qrCode.slice(0, 8).toUpperCase();
      const filename = `Etiqueta-${slugifyForFilename(brand)}-${slugifyForFilename(model)}-${reference}.png`;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
    } catch {
      toast.error("No se pudo generar la imagen de la etiqueta");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 border-t border-border bg-card p-3 print:hidden">
      <Link
        href={`/equipos/${equipmentId}`}
        className="inline-flex h-9 flex-1 max-w-40 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>
      <Button
        type="button"
        variant="outline"
        onClick={handleDownload}
        disabled={isDownloading}
        className="max-w-64 flex-1 gap-1.5"
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Descargar PNG
      </Button>
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
