"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { resolveAccentColor, getAccentTextColor } from "@/lib/print/accent-color";
import { buildPrintFooter } from "@/lib/print/footer";

type PreviewDocType = "workOrder" | "quote" | "collection";

const DOC_TYPE_LABELS: Record<PreviewDocType, string> = {
  workOrder: "Orden de trabajo",
  quote: "Cotización",
  collection: "Cuenta de cobro",
};

interface ControlBoxValues {
  code: string;
  version: string;
  date: string;
}

interface LetterheadPreviewProps {
  companyName: string;
  slogan: string;
  logoUrl: string | null;
  /** Valor crudo del input de color — puede venir vacío mientras el ADMIN escribe. */
  accentColorInput: string;
  footerText: string;
  showFixtrackBranding: boolean;
  website: string;
  email: string;
  phone: string;
  controlBoxes: Record<PreviewDocType, ControlBoxValues>;
}

/**
 * Vista previa en vivo del membrete de empresa: encabezado (logo + nombre +
 * recuadro de control) y pie de página, con los valores tal como quedarían
 * en el documento real — así el ADMIN no tiene que generar un PDF para ver
 * si el color de acento se lee bien o si el texto del pie quedó como
 * esperaba. Reutiliza exactamente las mismas funciones que los documentos
 * imprimibles (resolveAccentColor, getAccentTextColor, buildPrintFooter) —
 * nunca una aproximación visual distinta que pueda desalinearse de lo que
 * en verdad se imprime.
 */
export function LetterheadPreview({
  companyName,
  slogan,
  logoUrl,
  accentColorInput,
  footerText,
  showFixtrackBranding,
  website,
  email,
  phone,
  controlBoxes,
}: LetterheadPreviewProps) {
  const [docType, setDocType] = useState<PreviewDocType>("workOrder");

  const accentColor = resolveAccentColor(accentColorInput || null);
  const footer = buildPrintFooter({
    website: website || null,
    email: email || null,
    phone: phone || null,
    letterheadFooterText: footerText || null,
    letterheadShowFixtrackBranding: showFixtrackBranding,
  });
  const box = controlBoxes[docType];
  const hasControlBox = Boolean(box.code || box.version || box.date);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Vista previa
        </p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(DOC_TYPE_LABELS) as PreviewDocType[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setDocType(key)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                docType === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {DOC_TYPE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-white p-4 text-neutral-900 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo remoto en Cloudinary, sin dominio fijo que declarar
              <img src={logoUrl} alt={companyName} className="h-8 w-auto object-contain" />
            ) : (
              <div className="h-8 w-8 shrink-0 rounded bg-neutral-100" />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold" style={{ color: accentColor }}>
                {companyName || "Nombre de la empresa"}
              </span>
              {slogan && <span className="text-[10px] text-neutral-500">{slogan}</span>}
            </div>
          </div>
          {hasControlBox && (
            <div className="flex flex-col items-end gap-0.5 text-right text-[10px] text-neutral-600">
              {box.code && (
                <span>
                  <span className="font-semibold">Código:</span> {box.code}
                </span>
              )}
              {box.version && (
                <span>
                  <span className="font-semibold">Versión:</span> {box.version}
                </span>
              )}
              {box.date && (
                <span>
                  <span className="font-semibold">Fecha:</span> {box.date}
                </span>
              )}
            </div>
          )}
        </div>

        <hr className="mt-2 border-t-2" style={{ borderColor: accentColor }} />

        {/* Ejemplo de franja llena (ej. "Saldo a pagar" en la cuenta de
            cobro) — demuestra en vivo que el texto se mantiene legible sin
            importar qué tan claro sea el acento elegido. */}
        <div
          className="mt-3 flex w-fit items-center gap-6 rounded-md px-3 py-1.5 text-xs font-bold"
          style={{ backgroundColor: accentColor, color: getAccentTextColor(accentColor) }}
        >
          <span>Total</span>
          <span>$000.000</span>
        </div>

        {footer.text && (
          <p
            className="mt-4 border-t border-dashed border-neutral-200 pt-2 text-center text-[10px]"
            style={{ color: footer.useAccentColor ? accentColor : "#A3A3A3" }}
          >
            {footer.text}
          </p>
        )}
      </div>
    </div>
  );
}
