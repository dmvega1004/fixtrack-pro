import type { Company } from "@/lib/api/company";

/** Azul de marca compartido por todos los documentos imprimibles. */
export const PRINT_BRAND_BLUE = "#2563EB";

interface PrintLetterheadProps {
  company: Company;
}

/**
 * Membrete común a todos los documentos imprimibles (orden de trabajo,
 * cuenta de cobro): logo, nombre en azul, eslogan y línea de contacto.
 * La regla azul de abajo NO va acá — cada documento la agrega como
 * hermano, porque en algunos (cuenta de cobro) tiene que atravesar todo el
 * ancho por debajo de un bloque adicional a la derecha del membrete.
 */
export function PrintLetterhead({ company }: PrintLetterheadProps) {
  const contactLine = [company.address, company.phone, company.email]
    .filter(Boolean)
    .join("  |  ");

  return (
    <header className="flex items-start gap-4">
      {company.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- logo remoto (Cloudinary), sin dominio fijo que declarar en next.config
        <img
          src={company.logoUrl}
          alt={company.name}
          className="h-12 w-auto object-contain"
        />
      )}
      <div className="flex flex-col">
        <p className="text-2xl font-bold" style={{ color: PRINT_BRAND_BLUE }}>
          {company.name}
        </p>
        {company.slogan && (
          <p className="text-sm text-neutral-500">{company.slogan}</p>
        )}
        {contactLine && (
          <p className="mt-1 text-xs text-neutral-500">{contactLine}</p>
        )}
      </div>
    </header>
  );
}
