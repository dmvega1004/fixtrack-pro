interface PrintDocumentControlBoxProps {
  code?: string | null;
  version?: string | null;
  date?: string | null;
}

/**
 * Recuadro de control documental (código/versión/fecha), al estilo de los
 * sistemas de calidad — mismo formato que el control box de
 * client-report-format-document.tsx, pero alimentado desde el membrete de
 * la EMPRESA (Company.letterhead*DocCode/Version/Date), no desde el
 * formato de un cliente. Si la empresa no llenó ninguno de los 3 campos
 * para este documento, no se renderiza nada — nunca un marco vacío.
 */
export function PrintDocumentControlBox({
  code,
  version,
  date,
}: PrintDocumentControlBoxProps) {
  if (!code && !version && !date) return null;

  return (
    <div className="flex flex-col items-end gap-0.5 text-right text-xs text-neutral-600">
      {code && (
        <span>
          <span className="font-semibold">Código:</span> {code}
        </span>
      )}
      {version && (
        <span>
          <span className="font-semibold">Versión:</span> {version}
        </span>
      )}
      {date && (
        <span>
          <span className="font-semibold">Fecha:</span> {date}
        </span>
      )}
    </div>
  );
}
