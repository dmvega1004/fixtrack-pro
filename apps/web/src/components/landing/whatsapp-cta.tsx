import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Único canal de contacto de la landing: no hay formularios. Todos los
 * botones abren el mismo chat de WhatsApp con el mismo mensaje
 * predefinido — en Colombia esa es la vía real por la que un dueño de
 * taller pide una demostración.
 *
 * Número y texto viven acá, en un solo lugar, para que las ~4
 * apariciones del botón en la página no se desincronicen.
 */
const WHATSAPP_NUMBER = "573007594787";
const WHATSAPP_MESSAGE = "Hola, vi FixTrack Pro y quiero ver una demostración.";

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

interface WhatsappCtaProps {
  children?: React.ReactNode;
  /** `lg` para las apariciones principales (encabezado, cierre). */
  size?: "md" | "lg";
  className?: string;
}

export function WhatsappCta({
  children = "Ver una demostración por WhatsApp",
  size = "md",
  className,
}: WhatsappCtaProps) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        size === "lg"
          ? "h-13 px-7 text-base"
          : "h-11 px-5 text-sm",
        className,
      )}
    >
      <MessageCircle className={size === "lg" ? "size-5" : "size-4"} />
      {children}
    </a>
  );
}
