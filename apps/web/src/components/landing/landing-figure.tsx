"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Expand, X } from "lucide-react";
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

/** Ratio "9 / 20" → 0.45. Sirve para dimensionar el marco de la vista
 *  ampliada sin conocer el tamaño real de la imagen: ancho = alto · ratio. */
function ratioToNumber(ratio: string): number {
  const [w, h] = ratio.split("/").map((n) => Number.parseFloat(n.trim()));
  return w > 0 && h > 0 ? w / h : 16 / 10;
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
 *
 * VISTA AMPLIADA. En la landing las capturas se ven bien pero pequeñas y
 * el detalle —que es lo que convence— no se alcanza a leer. Al pulsar
 * cualquiera se abre un <dialog> nativo con la imagen COMPLETA, tan
 * grande como quepa en pantalla. Se hace acá, el único punto por donde
 * pasan todas las imágenes, para que una figura nueva lo herede sola.
 * `showModal()` trae gratis el fondo oscurecido, el cierre con Escape y
 * la devolución del foco al disparador; la imagen a resolución completa
 * se monta solo al abrir, así no pesa en la carga de la página.
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
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Mantiene el <dialog> nativo en sincronía con `open`. showModal() es lo
  // que pone el diálogo en la capa superior con su ::backdrop; el listener
  // de `close` cubre Escape y el botón de cerrar y devuelve el estado a
  // React. Algunos navegadores no frenan el scroll de atrás con
  // showModal(), así que se bloquea a mano mientras está abierto.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();

    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);

    const prevOverflow = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";

    return () => {
      dialog.removeEventListener("close", onClose);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const zoomRatio = ratioToNumber(ratio);

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-white",
          narrow && "mx-auto w-full max-w-64",
          className,
        )}
        style={{ aspectRatio: ratio }}
      >
        {failed ? (
          // Sin imagen no hay nada que ampliar: este marcador NO es un
          // botón, para que tocarlo no sugiera que algo falló.
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <ImageOff className="size-5 text-muted-foreground" aria-hidden />
            <span className="text-xs font-medium text-muted-foreground">
              {alt}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Ver en grande: ${alt}`}
            className="group absolute inset-0 block cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Image
              src={src}
              alt=""
              fill
              priority={priority}
              sizes={sizes}
              className="object-contain p-3"
              onError={() => setFailed(true)}
            />
            {/* Indicio de que se puede ampliar. En pantallas con hover
                aparece al pasar por encima; en las táctiles, donde no hay
                "pasar por encima", queda siempre visible. */}
            <span
              aria-hidden
              className="pointer-events-none absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-black/55 text-white opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100"
            >
              <Expand className="size-4" />
            </span>
          </button>
        )}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={`Vista ampliada: ${alt}`}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/80"
      >
        {open ? (
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            onClick={(e) => {
              // Pulsar fuera de la imagen cierra (en escritorio). En el
              // celular esto no existe: para eso está el botón de cerrar.
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="relative"
              style={{
                aspectRatio: ratio,
                width: `min(95vw, ${(88 * zoomRatio).toFixed(2)}dvh)`,
              }}
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="95vw"
                className="object-contain"
              />
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] flex size-12 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-colors hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="size-6" />
            </button>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
