"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Retention } from "@/lib/api/retentions";
import {
  RETENTION_BASES,
  RETENTION_BASE_LABELS,
  type RetentionBase,
} from "@/lib/retention-base";
import {
  createRetentionAction,
  reorderRetentionsAction,
  updateRetentionAction,
} from "@/app/(dashboard)/empresa/actions";

interface RetentionDraft {
  name: string;
  rate: string;
  base: RetentionBase;
  baseRetentionId: string;
}

const EMPTY_DRAFT: RetentionDraft = {
  name: "",
  rate: "",
  base: "SUBTOTAL",
  baseRetentionId: "",
};

function toDraft(retention: Retention): RetentionDraft {
  return {
    name: retention.name,
    rate: retention.rate,
    base: retention.base,
    baseRetentionId: retention.baseRetentionId ?? "",
  };
}

interface RetentionsCardProps {
  initialRetentions: Retention[];
}

/**
 * "Mi empresa" → tarjeta "Retenciones": catálogo de retenciones que la
 * empresa puede aplicar en sus órdenes (retefuente, reteICA, avisos y
 * tableros, tasa bomberil...). Cada acción (crear/editar/reordenar/
 * desactivar) es su propia llamada al servidor — no hay un botón
 * "Guardar" que junte todo, porque desactivar una retención por error y
 * corregirlo enseguida no debería depender de recordar guardar el resto
 * de la lista.
 */
export function RetentionsCard({ initialRetentions }: RetentionsCardProps) {
  const [retentions, setRetentions] = useState<Retention[]>(
    [...initialRetentions].sort((a, b) => a.position - b.position),
  );
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<RetentionDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Una retención no puede referenciarse a sí misma (ni ofrecerse como
  // base de sí misma en el selector) — el resto de ciclos indirectos los
  // rechaza el backend al guardar.
  const baseOptions = retentions.filter((r) => r.id !== editingId);

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setEditingId("new");
  }

  function openEdit(retention: Retention) {
    setDraft(toDraft(retention));
    setEditingId(retention.id);
  }

  function closeDialog() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  const isDraftValid =
    draft.name.trim() !== "" &&
    draft.rate.trim() !== "" &&
    Number.isFinite(Number(draft.rate)) &&
    Number(draft.rate) >= 0 &&
    Number(draft.rate) <= 100 &&
    (draft.base !== "RETENTION" || draft.baseRetentionId !== "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDraftValid || isSaving) return;

    setIsSaving(true);
    const dto = {
      name: draft.name.trim(),
      rate: Number(draft.rate),
      base: draft.base,
      baseRetentionId: draft.base === "RETENTION" ? draft.baseRetentionId : undefined,
    };

    const result =
      editingId === "new"
        ? await createRetentionAction(dto)
        : await updateRetentionAction(editingId!, dto);
    setIsSaving(false);

    if (!result.ok || !result.retention) {
      toast.error(result.message ?? "No se pudo guardar la retención");
      return;
    }

    setRetentions((current) => {
      const exists = current.some((r) => r.id === result.retention!.id);
      const next = exists
        ? current.map((r) => (r.id === result.retention!.id ? result.retention! : r))
        : [...current, result.retention!];
      return next.sort((a, b) => a.position - b.position);
    });
    toast.success(editingId === "new" ? "Retención creada" : "Retención actualizada");
    closeDialog();
  }

  async function toggleActive(retention: Retention) {
    setTogglingId(retention.id);
    const result = await updateRetentionAction(retention.id, {
      active: !retention.active,
    });
    setTogglingId(null);

    if (!result.ok || !result.retention) {
      toast.error(result.message ?? "No se pudo actualizar la retención");
      return;
    }
    setRetentions((current) =>
      current.map((r) => (r.id === retention.id ? result.retention! : r)),
    );
  }

  async function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= retentions.length) return;

    const reordered = [...retentions];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    setReorderingId(retentions[index].id);
    const result = await reorderRetentionsAction(reordered.map((r) => r.id));
    setReorderingId(null);

    if (!result.ok || !result.retentions) {
      toast.error(result.message ?? "No se pudo reordenar");
      return;
    }
    setRetentions([...result.retentions].sort((a, b) => a.position - b.position));
  }

  function baseLabel(retention: Retention): string {
    if (retention.base !== "RETENTION") {
      return RETENTION_BASE_LABELS[retention.base];
    }
    const base = retentions.find((r) => r.id === retention.baseRetentionId);
    return base ? `Sobre "${base.name}"` : RETENTION_BASE_LABELS.RETENTION;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retenciones</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          Retefuente, ReteICA, avisos y tableros, tasa bomberil... Las que
          marques acá quedan disponibles para aplicar en las órdenes.
          Desactivar una NO afecta las órdenes que ya la tienen aplicada —
          solo deja de ofrecerse en las nuevas.
        </p>

        {retentions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Todavía no has configurado ninguna retención.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {retentions.map((retention, index) => (
              <div
                key={retention.id}
                className="flex items-center gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === 0 || reorderingId !== null}
                    onClick={() => void move(index, -1)}
                    aria-label="Subir"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === retentions.length - 1 || reorderingId !== null}
                    onClick={() => void move(index, 1)}
                    aria-label="Bajar"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>

                <div className="flex flex-1 flex-col gap-0.5">
                  <span
                    className={
                      retention.active
                        ? "text-sm font-medium text-foreground"
                        : "text-sm font-medium text-muted-foreground line-through"
                    }
                  >
                    {retention.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Number(retention.rate)}% · {baseLabel(retention)}
                    {!retention.active && " · Desactivada"}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(retention)}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant={retention.active ? "outline" : "secondary"}
                  size="sm"
                  disabled={togglingId === retention.id}
                  onClick={() => void toggleActive(retention)}
                >
                  {retention.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="outline" size="sm" onClick={openCreate} className="self-start">
          <Plus className="size-4" />
          Agregar retención
        </Button>
      </CardContent>

      <Dialog open={editingId !== null} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId === "new" ? "Nueva retención" : "Editar retención"}
            </DialogTitle>
            <DialogDescription>
              El porcentaje admite hasta 3 decimales (ej. 0,9 para ReteICA).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retention-name">Nombre *</Label>
              <Input
                id="retention-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ej. Retefuente servicios"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retention-rate">Porcentaje *</Label>
              <Input
                id="retention-rate"
                type="number"
                min={0}
                max={100}
                step="0.001"
                value={draft.rate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, rate: event.target.value }))
                }
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="retention-base">Se calcula sobre *</Label>
              <select
                id="retention-base"
                value={draft.base}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    base: event.target.value as RetentionBase,
                    baseRetentionId:
                      event.target.value === "RETENTION" ? current.baseRetentionId : "",
                  }))
                }
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                {RETENTION_BASES.map((base) => (
                  <option key={base} value={base}>
                    {RETENTION_BASE_LABELS[base]}
                  </option>
                ))}
              </select>
            </div>

            {draft.base === "RETENTION" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="retention-base-id">¿Sobre cuál retención? *</Label>
                <select
                  id="retention-base-id"
                  value={draft.baseRetentionId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      baseRetentionId: event.target.value,
                    }))
                  }
                  className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
                  required
                >
                  <option value="">Selecciona una retención</option>
                  {baseOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                {baseOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Crea primero la retención base (ej. ReteICA) antes de
                    poder apoyar otra en ella.
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isDraftValid || isSaving}>
                {isSaving
                  ? "Guardando..."
                  : editingId === "new"
                    ? "Crear retención"
                    : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
