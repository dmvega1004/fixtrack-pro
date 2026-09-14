import { PRINT_BRAND_BLUE } from "@/components/work-orders/print/print-letterhead";

/** Color de acento efectivo del membrete de empresa: el configurado en "Mi
 * empresa", o el azul de FixTrack si no configuró ninguno — así una empresa
 * que no personaliza nada ve exactamente lo de siempre. */
export function resolveAccentColor(
  letterheadAccentColor: string | null | undefined,
): string {
  return letterheadAccentColor || PRINT_BRAND_BLUE;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.exec(hex.trim());
  if (!match) return null;
  let value = match[1];
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(value, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE_TEXT = "#FFFFFF";
/** Grafito oscuro — mismo tono que el texto del cuerpo del documento (text-neutral-900), no negro puro. */
const DARK_TEXT = "#1F2937";
const WHITE_LUMINANCE = 1;
const DARK_TEXT_LUMINANCE = relativeLuminance(hexToRgb(DARK_TEXT)!);

/**
 * Color de texto legible sobre un fondo pintado con el color de acento:
 * blanco o grafito oscuro, el que dé mejor contraste (luminancia relativa,
 * fórmula WCAG). Evita restringir qué colores puede elegir la empresa en el
 * selector — un acento muy claro (ej. un amarillo pastel) cae automáticamente
 * a texto oscuro en vez de blanco ilegible, sin que nadie tenga que pensarlo
 * al configurar el membrete.
 */
export function getAccentTextColor(accentColor: string): string {
  const rgb = hexToRgb(accentColor);
  if (!rgb) return WHITE_TEXT;
  const backgroundLuminance = relativeLuminance(rgb);
  const whiteContrast = contrastRatio(WHITE_LUMINANCE, backgroundLuminance);
  const darkContrast = contrastRatio(DARK_TEXT_LUMINANCE, backgroundLuminance);
  return darkContrast > whiteContrast ? DARK_TEXT : WHITE_TEXT;
}

/**
 * Tinte muy claro del color de acento, para el fondo de cajas informativas
 * (ej. el bloque "Orden de trabajo / Fecha del servicio" de la cuenta de
 * cobro) que antes tenían un azul fijo (bg-blue-50) sin relación con el
 * acento — con un acento no azul, esa combinación quedaba descoordinada
 * (borde en el color de la empresa, fondo siempre azul). rgba() con alfa
 * bajo en vez de manipular HSL: mismo criterio simple que
 * getAccentTextColor, funciona para cualquier hex de entrada. El texto
 * dentro de estas cajas es siempre gris/negro (nunca blanco), así que no
 * necesita pasar por getAccentTextColor.
 */
export function getAccentTint(accentColor: string, alpha = 0.08): string {
  const rgb = hexToRgb(accentColor);
  if (!rgb) return `rgba(37, 99, 235, ${alpha})`;
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
