interface FooterCompany {
  website: string | null;
  email: string | null;
  phone: string | null;
  letterheadFooterText: string | null;
  letterheadShowFixtrackBranding: boolean;
}

export interface PrintFooter {
  /** "" si no hay nada que mostrar (marca apagada, sin pie propio ni datos de contacto) — el llamador debe tratarlo como "sin pie". */
  text: string;
  /**
   * true si el texto viene del pie propio de la empresa
   * (letterheadFooterText) — se pinta en el color de acento, como pide el
   * membrete. false = línea de contacto automática de siempre, en gris.
   */
  useAccentColor: boolean;
}

/**
 * Compone el pie de página repetido en cada hoja de los 3 documentos
 * (orden de trabajo, cotización, cuenta de cobro): mismo criterio en los
 * tres, antes duplicado en cada archivo.
 *
 * Sin letterheadFooterText: línea de contacto automática (sitio | correo |
 * teléfono) tal como siempre — el membrete no cambia nada si la empresa no
 * lo configuró. Con letterheadFooterText: ese texto reemplaza la línea de
 * contacto, en el color de acento. En ambos casos se agrega la marca
 * "Documento generado por FixTrack Pro" salvo que la empresa la haya
 * desactivado (letterheadShowFixtrackBranding=false, ambos ejes de forma
 * aditiva y por defecto true = comportamiento de hoy).
 */
export function buildPrintFooter(company: FooterCompany): PrintFooter {
  const brandingMark = company.letterheadShowFixtrackBranding
    ? "Documento generado por FixTrack Pro"
    : null;

  if (company.letterheadFooterText) {
    const text = brandingMark
      ? `${company.letterheadFooterText} · ${brandingMark}`
      : company.letterheadFooterText;
    return { text, useAccentColor: true };
  }

  const contact = company.website || company.email || company.phone;
  const text = contact
    ? brandingMark
      ? `${contact} · ${brandingMark}`
      : contact
    : (brandingMark ?? "");
  return { text, useAccentColor: false };
}
