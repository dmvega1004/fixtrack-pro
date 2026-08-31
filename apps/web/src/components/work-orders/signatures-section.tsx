"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "@/components/shared/signature-pad";
import type { WorkOrder } from "@/lib/api/work-orders";
import { formatDate, formatTime } from "@/lib/format/dates";
import {
  saveSignaturesAction,
  type SaveSignaturesInput,
} from "@/app/(dashboard)/ordenes/[id]/actions";

interface MyProfileForSignature {
  name: string;
  documentNumber: string | null;
  signatureImageUrl: string | null;
}

interface SignaturesSectionProps {
  orderId: string;
  order: WorkOrder;
  myProfile: MyProfileForSignature;
  isTerminal: boolean;
}

interface UploadResponse {
  url?: string;
}

interface UploadErrorBody {
  message?: string;
}

function SignaturePreview({ url }: { url: string }) {
  return (
    <div className="flex h-28 w-full max-w-56 items-center justify-center rounded-lg border border-border bg-white p-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- firma remota en Cloudinary, sin dominio fijo que declarar */}
      <img src={url} alt="Firma" className="h-full w-full object-contain" />
    </div>
  );
}

/**
 * Bloque "Firmas" (pestaña Detalles, Módulo de Firmas): captura en sitio
 * de la firma del técnico (o de quien esté ejecutando/firmando — ADMIN y
 * COORDINATOR también, ver Perfil → "Mi firma") y de quien recibe.
 *
 * Con la orden en estado terminal, se ve pero no se puede cambiar — una
 * firma que se puede reemplazar después no prueba nada.
 */
export function SignaturesSection({
  orderId,
  order,
  myProfile,
  isTerminal,
}: SignaturesSectionProps) {
  const router = useRouter();

  const [isRedrawingTechnician, setIsRedrawingTechnician] = useState(false);
  const [technicianAdHocUrl, setTechnicianAdHocUrl] = useState<string | null>(null);

  const [isRedrawingReceiver, setIsRedrawingReceiver] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverDocument, setReceiverDocument] = useState("");
  const [receiverDrawnUrl, setReceiverDrawnUrl] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const technicianFrozen = !isRedrawingTechnician && !!order.technicianSignatureUrl;
  const technicianEffectiveUrl = technicianFrozen
    ? order.technicianSignatureUrl
    : (myProfile.signatureImageUrl ?? technicianAdHocUrl);
  const technicianReady = Boolean(technicianEffectiveUrl);

  const receiverFrozen = !isRedrawingReceiver && !!order.receiverSignatureUrl;
  const receiverReady = receiverFrozen
    ? true
    : receiverName.trim() !== "" &&
      receiverDocument.trim() !== "" &&
      Boolean(receiverDrawnUrl);

  const canSave = !isTerminal && technicianReady && receiverReady;

  async function uploadSignature(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/upload/work-order-signature/${orderId}`, {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data as UploadErrorBody | null)?.message;
        toast.error(message ?? "No se pudo subir la firma");
        return null;
      }

      return (data as UploadResponse).url ?? null;
    } catch {
      toast.error("No se pudo subir la firma");
      return null;
    }
  }

  async function handleTechnicianDraw(file: File): Promise<boolean> {
    const url = await uploadSignature(file);
    if (!url) return false;
    setTechnicianAdHocUrl(url);
    return true;
  }

  async function handleReceiverDraw(file: File): Promise<boolean> {
    const url = await uploadSignature(file);
    if (!url) return false;
    setReceiverDrawnUrl(url);
    return true;
  }

  async function handleSaveAll() {
    if (!canSave) return;

    const dto: SaveSignaturesInput = {};
    if (!technicianFrozen) {
      dto.technicianSignatureUrl = technicianEffectiveUrl!;
    }
    if (!receiverFrozen) {
      dto.receiverName = receiverName.trim();
      dto.receiverDocument = receiverDocument.trim();
      dto.receiverSignatureUrl = receiverDrawnUrl!;
    }

    setIsSaving(true);
    const result = await saveSignaturesAction(orderId, dto);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudieron guardar las firmas");
      return;
    }

    toast.success("Firmas guardadas");
    setIsRedrawingTechnician(false);
    setIsRedrawingReceiver(false);
    setTechnicianAdHocUrl(null);
    setReceiverDrawnUrl(null);
    setReceiverName("");
    setReceiverDocument("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Firmas</h3>
        {order.signedAt && (
          <span className="text-xs text-muted-foreground">
            Firmado el {formatDate(order.signedAt)} · {formatTime(order.signedAt)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Lado del técnico */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Técnico
          </span>

          {technicianFrozen ? (
            <div className="flex flex-col gap-2">
              <SignaturePreview url={order.technicianSignatureUrl!} />
              <div className="text-xs text-muted-foreground">
                <p>{order.technicianName}</p>
                <p>{order.technicianDocument}</p>
              </div>
              {!isTerminal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setIsRedrawingTechnician(true)}
                >
                  Firmar de nuevo
                </Button>
              )}
            </div>
          ) : myProfile.signatureImageUrl ? (
            <div className="flex flex-col gap-2">
              <SignaturePreview url={myProfile.signatureImageUrl} />
              <div className="text-xs text-muted-foreground">
                <p>{myProfile.name}</p>
                <p>{myProfile.documentNumber ?? "Sin documento en tu perfil"}</p>
              </div>
              {isRedrawingTechnician && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setIsRedrawingTechnician(false)}
                >
                  Usar mi firma de perfil
                </Button>
              )}
            </div>
          ) : technicianAdHocUrl ? (
            <div className="flex flex-col gap-2">
              <SignaturePreview url={technicianAdHocUrl} />
              <p className="text-xs text-muted-foreground">
                Firma capturada solo para esta orden (no se guardó en tu perfil).
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setTechnicianAdHocUrl(null)}
              >
                Volver a dibujar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  No tienes firma guardada en tu perfil.{" "}
                  <Link href="/perfil" className="font-medium underline">
                    Créala en Perfil
                  </Link>{" "}
                  o dibújala aquí, solo para esta orden.
                </span>
              </div>
              <SignaturePad onSave={handleTechnicianDraw} saveLabel="Usar esta firma" />
            </div>
          )}
        </div>

        {/* Lado de quien recibe */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Quien recibe
          </span>

          {receiverFrozen ? (
            <div className="flex flex-col gap-2">
              <SignaturePreview url={order.receiverSignatureUrl!} />
              <div className="text-xs text-muted-foreground">
                <p>{order.receiverName}</p>
                <p>{order.receiverDocument}</p>
              </div>
              {!isTerminal && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setIsRedrawingReceiver(true)}
                >
                  Firmar de nuevo
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="receiverName">Nombre</Label>
                  <Input
                    id="receiverName"
                    value={receiverName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setReceiverName(event.target.value)
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="receiverDocument">Documento</Label>
                  <Input
                    id="receiverDocument"
                    value={receiverDocument}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setReceiverDocument(event.target.value)
                    }
                  />
                </div>
              </div>

              {receiverDrawnUrl ? (
                <div className="flex flex-col gap-2">
                  <SignaturePreview url={receiverDrawnUrl} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => setReceiverDrawnUrl(null)}
                  >
                    Volver a dibujar
                  </Button>
                </div>
              ) : (
                <SignaturePad onSave={handleReceiverDraw} saveLabel="Usar esta firma" />
              )}
            </div>
          )}
        </div>
      </div>

      {!isTerminal && (
        <Button
          type="button"
          onClick={() => void handleSaveAll()}
          disabled={!canSave || isSaving}
          className="self-start"
        >
          {isSaving ? "Guardando..." : "Guardar firmas"}
        </Button>
      )}
    </div>
  );
}
