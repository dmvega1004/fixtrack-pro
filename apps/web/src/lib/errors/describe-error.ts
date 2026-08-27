import { WifiOff, TimerOff, AlertTriangle, type LucideIcon } from "lucide-react";

export interface ErrorDescription {
  Icon: LucideIcon;
  message: string;
}

/**
 * Traduce el `digest` de un error (ver lib/api/http.ts — es lo único que
 * sobrevive a la redacción de mensajes que Next.js aplica en producción a
 * los errores de Server Components/Actions) a uno de los tres mensajes que
 * el usuario necesita distinguir. Nunca expone el mensaje técnico ni el
 * código de error crudo.
 */
export function describeError(digest?: string): ErrorDescription {
  if (digest === "FIXTRACK_NETWORK") {
    return {
      Icon: WifiOff,
      message: "No hay conexión a internet. Verifica tu señal e intenta de nuevo.",
    };
  }

  if (digest === "FIXTRACK_TIMEOUT") {
    return {
      Icon: TimerOff,
      message:
        "El servidor está tardando más de lo normal. Puede que tu señal sea débil. Intenta de nuevo.",
    };
  }

  return {
    Icon: AlertTriangle,
    message: "No pudimos cargar esta sección. Intenta de nuevo.",
  };
}
