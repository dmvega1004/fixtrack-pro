import { Camera } from "lucide-react";
import { cloudinaryUrl } from "@/lib/image/cloudinary-url";
import { cn } from "@/lib/utils";

interface EquipmentCoverProps {
  /** URL almacenada de la portada (Cloudinary); null si el equipo no tiene fotos. */
  url: string | null | undefined;
  /** Texto alternativo — normalmente «Foto de <marca> <modelo>». */
  alt: string;
  /** Tamaño FIJO del cuadro (ej. "size-16"). Con o sin foto mide lo mismo. */
  sizeClassName: string;
  /** Tamaño del ícono del marcador neutro. */
  iconClassName?: string;
  /**
   * "lazy" para listas (lo que está fuera de pantalla no se descarga hasta
   * acercarse — y en el contenedor oculto por breakpoint no se descarga
   * nunca). "eager" para lo que siempre está arriba (encabezado del detalle).
   */
  loading?: "lazy" | "eager";
}

/**
 * Portada del equipo en tamaño fijo. SIEMPRE con el preset `thumbnail`
 * (c_fill,w_320,h_320,q_auto,f_auto): nunca el original, ni siquiera en el
 * encabezado — 320 px cubren un cuadro de ~110 px en pantallas 3x.
 *
 * Sin foto: marcador neutro del MISMO tamaño, para que la tarjeta o la fila
 * nunca cambien de forma por tener o no portada.
 */
export function EquipmentCover({
  url,
  alt,
  sizeClassName,
  iconClassName = "size-5",
  loading = "lazy",
}: EquipmentCoverProps) {
  const box = cn(
    "shrink-0 overflow-hidden rounded-lg border border-border bg-muted",
    sizeClassName,
  );

  if (!url) {
    return (
      <div
        role="img"
        aria-label="Equipo sin foto"
        className={cn(box, "flex items-center justify-center text-muted-foreground")}
      >
        <Camera className={iconClassName} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element -- foto remota en Cloudinary, sin dominio fijo que declarar */}
      <img
        src={cloudinaryUrl(url, "thumbnail")}
        alt={alt}
        loading={loading}
        decoding="async"
        width={320}
        height={320}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
