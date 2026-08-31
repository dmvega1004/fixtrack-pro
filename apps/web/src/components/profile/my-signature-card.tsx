"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/shared/signature-pad";
import { saveDocumentNumberAction } from "@/app/(dashboard)/perfil/actions";

interface UploadResponse {
  signatureImageUrl?: string | null;
}

interface UploadErrorBody {
  message?: string;
}

interface MySignatureCardProps {
  initialDocumentNumber: string | null;
  initialSignatureUrl: string | null;
}

/**
 * Perfil → "Mi firma": documento (editable) + rúbrica dibujada UNA vez y
 * reutilizada al firmar cualquier orden (ver SignaturesSection). Los tres
 * roles llegan acá — el administrador y el coordinador también firman
 * órdenes.
 */
export function MySignatureCard({
  initialDocumentNumber,
  initialSignatureUrl,
}: MySignatureCardProps) {
  const router = useRouter();
  const initialDoc = initialDocumentNumber ?? "";
  const [documentNumber, setDocumentNumber] = useState(initialDoc);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(initialSignatureUrl);
  const [isRedrawing, setIsRedrawing] = useState(false);

  async function handleSaveDocumentNumber() {
    setIsSavingDocument(true);
    const result = await saveDocumentNumberAction(documentNumber.trim());
    setIsSavingDocument(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar el documento");
      return;
    }

    toast.success("Documento guardado");
    router.refresh();
  }

  async function handleSaveSignature(file: File): Promise<boolean> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload/user-signature", {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data as UploadErrorBody | null)?.message;
        toast.error(message ?? "No se pudo guardar la firma");
        return false;
      }

      setSignatureUrl((data as UploadResponse).signatureImageUrl ?? null);
      setIsRedrawing(false);
      toast.success("Firma guardada");
      router.refresh();
      return true;
    } catch {
      toast.error("No se pudo guardar la firma");
      return false;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="documentNumber">Número de documento</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="documentNumber"
            value={documentNumber}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDocumentNumber(event.target.value)
            }
            placeholder="Ej. 1098765432"
            className="max-w-56"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleSaveDocumentNumber()}
            disabled={isSavingDocument || documentNumber.trim() === initialDoc}
          >
            {isSavingDocument ? "Guardando..." : "Guardar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Se congela sobre cada orden al capturar tu firma como técnico.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Mi firma</Label>
        {signatureUrl && !isRedrawing ? (
          <div className="flex flex-col items-start gap-2">
            <div className="flex h-32 w-full max-w-xs items-center justify-center rounded-lg border border-border bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- firma remota en Cloudinary, sin dominio fijo que declarar */}
              <img
                src={signatureUrl}
                alt="Mi firma"
                className="h-full w-full object-contain"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRedrawing(true)}
            >
              Volver a dibujar
            </Button>
          </div>
        ) : (
          <>
            <SignaturePad onSave={handleSaveSignature} saveLabel="Guardar mi firma" />
            {isRedrawing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 self-start"
                onClick={() => setIsRedrawing(false)}
              >
                Cancelar
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
