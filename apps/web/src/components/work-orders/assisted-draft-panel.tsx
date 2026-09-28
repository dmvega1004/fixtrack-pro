"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WandSparkles, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  generateAssistedDraftAction,
  getAssistedDraftQuotaAction,
  saveAssistedFieldAction,
} from "@/app/(dashboard)/ordenes/[id]/actions";
import {
  ASSISTED_FIELD_LABELS,
  findMissingInfoMarkers,
  type AssistedDraft,
  type AssistedDraftQuota,
  type AssistedTextField,
} from "@/lib/assisted-draft";
import { MissingInfoAlert } from "./long-text-field-editor";

const FIELDS: AssistedTextField[] = ["diagnosis", "observations", "suggestions"];

const TEXTAREA_CLASS =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

const HANDWRITE_HINT = "Puedes seguir escribiendo a mano en los campos de abajo.";

/**
 * Última disponibilidad confirmada por el backend. Solo sirve para decidir,
 * SIN señal, si mostrar el botón desactivado ("requiere conexión") o nada:
 * sin señal no hay cómo preguntarle al backend.
 */
const AVAILABILITY_STORAGE_KEY = "fixtrack.assistedDraft.available";

function readLastKnownAvailability(): boolean {
  try {
    return window.localStorage.getItem(AVAILABILITY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberAvailability(available: boolean): void {
  try {
    window.localStorage.setItem(AVAILABILITY_STORAGE_KEY, String(available));
  } catch {
    // Almacenamiento bloqueado: sin señal simplemente no se muestra el botón.
  }
}

interface AssistedDraftPanelProps {
  orderId: string;
  isTerminal: boolean;
  /** Valor vigente de cada campo: precarga los apuntes y decide si "Usar" pide confirmación. */
  currentValues: Record<AssistedTextField, string | null>;
}

/**
 * Redacción asistida: apuntes sueltos → borrador de Diagnóstico,
 * Observaciones y Sugerencias según docs/plantillas-redaccion.md (lo
 * aplica el backend). Una acción concreta sobre la orden, no un chat.
 *
 * El borrador NUNCA se guarda solo: cada campo se revisa, se edita y se
 * guarda con su propio botón, y reemplazar un campo que ya tiene texto
 * pide confirmación. Mientras quede una marca [FALTA: …] no se puede
 * guardar.
 *
 * Si la función no está disponible en el servidor (sin llave del
 * proveedor o sin plantillas — falla cerrada del backend), el botón NO se
 * muestra: un técnico nunca ve un botón que no puede funcionar. Tampoco
 * mientras la disponibilidad no está confirmada.
 *
 * Sin señal: el botón queda desactivado con el motivo a la vista (solo si
 * la última consulta confirmó que la función existe). Los
 * apuntes se escriben donde ya se puede sin señal —los campos de abajo,
 * que suben por la cola de siempre— y al volver la señal este panel los
 * precarga como apuntes.
 */
export function AssistedDraftPanel({ orderId, isTerminal, currentValues }: AssistedDraftPanelProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [quota, setQuota] = useState<AssistedDraftQuota | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<AssistedDraft | null>(null);
  const [savingField, setSavingField] = useState<AssistedTextField | null>(null);
  const [confirmingField, setConfirmingField] = useState<AssistedTextField | null>(null);
  const [savedFields, setSavedFields] = useState<Set<AssistedTextField>>(new Set());
  const [lastKnownAvailable, setLastKnownAvailable] = useState(false);

  // Con señal: se confirma con el backend antes de mostrar nada. Una
  // consulta fallida cuenta como "no disponible" (el botón no aparece).
  useEffect(() => {
    if (!isOnline || isTerminal) {
      setLastKnownAvailable(readLastKnownAvailability());
      return;
    }
    let cancelled = false;
    void getAssistedDraftQuotaAction().then((status) => {
      if (cancelled) return;
      setQuota(status);
      rememberAvailability(status?.available ?? false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOnline, isTerminal]);

  if (isTerminal) return null;

  const isAvailable = isOnline ? quota?.available === true : lastKnownAvailable;
  if (!isAvailable && !isOpen) return null;

  function handleOpen() {
    setIsOpen(true);
    setNotes(prefillNotes(currentValues));
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setNotice(null);
    const result = await generateAssistedDraftAction(orderId, notes);
    setIsGenerating(false);

    switch (result.outcome) {
      case "OK":
        setDraft(result.draft);
        setQuota(result.quota);
        setSavedFields(new Set());
        setConfirmingField(null);
        return;
      case "QUOTA_EXHAUSTED":
        setQuota(result.quota);
        setNotice(`Se agotó la cuota de redacción asistida de este mes (${result.quota.limit}). ${HANDWRITE_HINT}`);
        return;
      case "UNAVAILABLE":
        setNotice(`La redacción asistida no está disponible en este momento. ${HANDWRITE_HINT}`);
        return;
      case "PROVIDER_ERROR":
        setNotice(`No se pudo redactar el borrador esta vez; no se descontó de tu cuota. Intenta de nuevo en un momento. ${HANDWRITE_HINT}`);
        return;
      case "ERROR":
        setNotice(result.message);
        return;
    }
  }

  async function handleSave(field: AssistedTextField) {
    if (!draft) return;
    const hasExistingText = (currentValues[field] ?? "").trim() !== "";
    if (hasExistingText && confirmingField !== field) {
      setConfirmingField(field);
      return;
    }

    setConfirmingField(null);
    setSavingField(field);
    const result = await saveAssistedFieldAction(orderId, field, draft[field]);
    setSavingField(null);

    if (!result.ok) {
      toast.error(result.message ?? `No se pudo guardar ${ASSISTED_FIELD_LABELS[field].toLowerCase()}`);
      return;
    }
    toast.success(`${ASSISTED_FIELD_LABELS[field]} guardado`);
    setSavedFields((prev) => new Set(prev).add(field));
    router.refresh();
  }

  const quotaExhausted = quota !== null && quota.remaining === 0;
  const unavailable = quota !== null && !quota.available;
  const canGenerate = isOnline && !isGenerating && !quotaExhausted && !unavailable && notes.trim().length >= 10;

  if (!isOpen) {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="outline" className="self-start" onClick={handleOpen} disabled={!isOnline}>
          <WandSparkles className="size-4" />
          Redactar con asistencia
        </Button>
        {!isOnline && <OfflineReason />}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Redacción asistida</h2>
          <p className="text-xs text-muted-foreground">
            Escribe o dicta tus apuntes tal cual. Recibirás un borrador para revisar: nada se guarda sin que lo
            confirmes, y todo lo que diga el borrador debe salir de tus apuntes.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cerrar
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="assisted-notes" className="text-sm font-medium">
          Apuntes
        </label>
        <textarea
          id="assisted-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={6}
          placeholder="Ej.: el variador se calienta, filtros tapados de harina, cambié el terminal quemado, probé 90 minutos"
          className={TEXTAREA_CLASS}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void handleGenerate()} disabled={!canGenerate}>
            <WandSparkles className="size-4" />
            {isGenerating ? "Redactando… (puede tardar hasta un minuto)" : draft ? "Volver a redactar" : "Redactar borrador"}
          </Button>
          {quota && quota.available && (
            <span className="text-xs text-muted-foreground">
              Quedan {quota.remaining} de {quota.limit} este mes
            </span>
          )}
        </div>
        {!isOnline && <OfflineReason />}
        {unavailable && !notice && (
          <p className="text-sm text-muted-foreground">
            La redacción asistida no está disponible en este momento. {HANDWRITE_HINT}
          </p>
        )}
        {quotaExhausted && !notice && (
          <p className="text-sm text-muted-foreground">
            Se agotó la cuota de redacción asistida de este mes. {HANDWRITE_HINT}
          </p>
        )}
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
      </div>

      {draft && (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {draft.missingInfo.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Información que faltó en tus apuntes:</p>
              <ul className="list-disc pl-5">
                {draft.missingInfo.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {FIELDS.map((field) => {
            const markers = findMissingInfoMarkers(draft[field]);
            const label = ASSISTED_FIELD_LABELS[field];
            const isSaved = savedFields.has(field);
            return (
              <div key={field} className="flex flex-col gap-2">
                <label htmlFor={`assisted-${field}`} className="text-sm font-medium">
                  {label} — borrador
                </label>
                <textarea
                  id={`assisted-${field}`}
                  value={draft[field]}
                  onChange={(event) => {
                    setDraft({ ...draft, [field]: event.target.value });
                    setSavedFields((prev) => {
                      const next = new Set(prev);
                      next.delete(field);
                      return next;
                    });
                  }}
                  rows={8}
                  aria-invalid={markers.length > 0}
                  className={`${TEXTAREA_CLASS} ${markers.length > 0 ? "border-destructive ring-3 ring-destructive/30" : ""}`}
                />
                {markers.length > 0 && <MissingInfoAlert markers={markers} />}

                {confirmingField === field ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
                    <span>{label} ya tiene texto. ¿Reemplazarlo por este borrador?</span>
                    <Button size="sm" onClick={() => void handleSave(field)}>
                      Reemplazar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingField(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      className="self-start"
                      onClick={() => void handleSave(field)}
                      disabled={!isOnline || savingField !== null || markers.length > 0 || draft[field].trim() === "" || isSaved}
                    >
                      {savingField === field ? "Guardando..." : isSaved ? "Guardado" : `Guardar en ${label}`}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function OfflineReason() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      Requiere conexión. Sin señal, escribe tus apuntes en los campos de abajo y redacta cuando vuelva la señal.
    </p>
  );
}

/** Lo que ya hay escrito en los campos, rotulado, como punto de partida de los apuntes. */
function prefillNotes(values: Record<AssistedTextField, string | null>): string {
  return FIELDS.filter((field) => values[field]?.trim())
    .map((field) => `${ASSISTED_FIELD_LABELS[field]}:\n${values[field]!.trim()}`)
    .join("\n\n");
}
