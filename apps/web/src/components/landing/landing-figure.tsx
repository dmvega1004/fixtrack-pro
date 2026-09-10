"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LandingFigureProps {
  src: string;
  alt: string;
  /** `aspect-ratio` CSS del marco. El alto se deriva del ancho real. */
  ratio?: string;
  /**
   * Captura VERTICAL (pantallazo de celular). Le pone un ancho máximo y la
   * centra: sin esto, un marco de proporción vertical ocupando el ancho
   * completo de la columna sale altísimo y empequeñece a las capturas
   * apaisadas de al lado. Ancho real de la imagen ≈ el de un teléfono.
   */
  narrow?: boolean;
  /** Solo la imagen del encabezado: se descarga con prioridad. */
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Pantallazo del producto en la landing. Las imágenes viven en
 * public/landing/ y se suben aparte — esta página tiene que verse
 * presentable AUNQUE falte alguna. Por eso:
 *
 *  - El marco siempre ocupa su espacio (aspect-ratio fijo): si la imagen
 *    no está, no hay salto de layout ni hueco que colapsa.
 *  - `onError` cambia a un marcador sobrio con el texto de la imagen —
 *    nunca el ícono de imagen rota del navegador.
 *  - next/image con `sizes` explícito: no se baja una imagen más grande
 *    que el hueco donde entra. Una landing lenta pierde visitantes.
 *
 * `object-contain`, NO `object-cover` — a propósito, no lo cambies.
 * `object-cover` recorta en silencio: si una imagen tiene una forma
 * distinta a la del marco, se le come los bordes sin que nadie se entere.
 * Las capturas de esta página se reemplazan seguido y no siempre con la
 * misma proporción (etiqueta-qr.png, por ejemplo, todavía está pendiente
 * de corregir), así que con `cover` cualquier reemplazo puede volver a
 * salir recortado y pasar desapercibido. Con `contain` el peor caso es
 * una franja en blanco a los lados: visible, evidente y sin pérdida de
 * información. El fondo blanco + el relleno hacen que esa franja se lea
 * como el marco de una captura, no como un error.
 */
export function LandingFigure({
  src,
  alt,
  ratio = "16 / 10",
  narrow = false,
  priority = false,
  sizes = "(min-width: 768px) 640px, 100vw",
  className,
}: LandingFigureProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-white",
        narrow && "mx-auto w-full max-w-64",
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <ImageOff className="size-5 text-muted-foreground" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground">
            {alt}
          </span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-contain p-3"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
