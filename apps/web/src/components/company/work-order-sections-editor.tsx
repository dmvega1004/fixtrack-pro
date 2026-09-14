"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  REPORT_FORMAT_SOURCES,
  REPORT_FORMAT_SOURCE_LABELS,
  type ReportFormatSource,
} from "@/lib/report-format";
import { MAX_WORK_ORDER_SECTIONS } from "@/lib/work-order-sections";

/** `id` es una clave de UI efímera (no se guarda) — solo para que React no pierda el foco al reordenar. */
export interface EditableWorkOrderSection {
  id: string;
  label: string;
  source: ReportFormatSource;
}

interface WorkOrderSectionsEditorProps {
  value: EditableWorkOrderSection[];
  onChange: (next: EditableWorkOrderSection[]) => void;
}

export function newSectionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `section-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Editor de secciones de contenido de la orden de trabajo — mismo
 * mecanismo que Client.reportFormatS1/S2/S3 (rótulo + origen) del Módulo
 * de Formatos, pero lista variable: agregar añade al final, quitar
 * elimina, las flechas reordenan. Mismo criterio "sin pantalla adicional"
 * que HeaderFieldsPicker — el orden en pantalla es el orden que se
 * guarda y se imprime.
 */
export function WorkOrderSectionsEditor({ value, onChange }: WorkOrderSectionsEditorProps) {
  function addSection() {
    onChange([...value, { id: newSectionId(), label: "", source: "DESCRIPTION" }]);
  }

  function removeSection(id: string) {
    onChange(value.filter((section) => section.id !== id));
  }

  function updateLabel(id: string, label: string) {
    onChange(value.map((section) => (section.id === id ? { ...section, label } : section)));
  }

  function updateSource(id: string, source: ReportFormatSource) {
    onChange(value.map((section) => (section.id === id ? { ...section, source } : section)));
  }

  function move(id: string, direction: -1 | 1) {
    const index = value.findIndex((section) => section.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((section, index) => (
        <div key={section.id} className="flex items-start gap-2 rounded-lg border border-border p-2">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <Input
              value={section.label}
              onChange={(event) => updateLabel(section.id, event.target.value)}
              placeholder="Rótulo (ej. Descripción del Trabajo)"
              aria-label="Rótulo de la sección"
              className="sm:flex-1"
            />
            <select
              value={section.source}
              onChange={(event) => updateSource(section.id, event.target.value as ReportFormatSource)}
              aria-label="Origen de la sección"
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground sm:w-64"
            >
              {REPORT_FORMAT_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {REPORT_FORMAT_SOURCE_LABELS[source]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => move(section.id, -1)}
              disabled={index === 0}
              className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Mover sección antes"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(section.id, 1)}
              disabled={index === value.length - 1}
              className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
              aria-label="Mover sección después"
            >
              <ChevronDown className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => removeSection(section.id)}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Quitar sección"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSection}
        disabled={value.length >= MAX_WORK_ORDER_SECTIONS}
        className="w-fit"
      >
        <Plus className="size-4" />
        Agregar sección
      </Button>
      {value.length >= MAX_WORK_ORDER_SECTIONS && (
        <p className="text-xs text-muted-foreground">Máximo {MAX_WORK_ORDER_SECTIONS} secciones.</p>
      )}
    </div>
  );
}
