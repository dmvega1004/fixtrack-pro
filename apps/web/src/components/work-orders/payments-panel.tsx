"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/dates";
import type { Payment } from "@/lib/api/payments";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/payment-method";
import {
  createPaymentAction,
  deletePaymentAction,
} from "@/app/(dashboard)/ordenes/[id]/actions";

interface PaymentsPanelProps {
  orderId: string;
  payments: Payment[];
  /** Total − abonado, ya calculado por el backend (WorkOrderBilling). */
  balance: string;
  currency: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Bloque «Pagos» de la pestaña Valores. Solo se monta si el llamador ya
 * verificó ADMIN + orden cerrada (ver PartsTab) — este componente no repite
 * esa condición, asume que si existe, aplica.
 */
export function PaymentsPanel({ orderId, payments, balance, currency }: PaymentsPanelProps) {
  const router = useRouter();
  const balanceNum = Number(balance);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [amount, setAmount] = useState(balance);
  const [paidAt, setPaidAt] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const amountNum = Number(amount);
  const isValid =
    amount.trim() !== "" &&
    !Number.isNaN(amountNum) &&
    amountNum > 0 &&
    amountNum <= balanceNum + 0.001 &&
    paidAt.trim() !== "";

  function openForm() {
    setAmount(balance);
    setPaidAt(todayIso());
    setMethod("CASH");
    setReference("");
    setNotes("");
    setIsFormOpen(true);
  }

  async function handleCreate() {
    if (!isValid) return;

    setIsSaving(true);
    const result = await createPaymentAction(orderId, {
      amount: amountNum,
      paidAt,
      method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo registrar el pago");
      return;
    }

    toast.success("Pago registrado");
    setIsFormOpen(false);
    router.refresh();
  }

  async function handleDelete(paymentId: string) {
    if (!window.confirm("¿Eliminar este pago? No se puede deshacer.")) return;

    setDeletingId(paymentId);
    const result = await deletePaymentAction(orderId, paymentId);
    setDeletingId(null);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo eliminar el pago");
      return;
    }

    toast.success("Pago eliminado");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Pagos</h3>
        {balanceNum > 0 && !isFormOpen && (
          <Button size="sm" onClick={openForm}>
            Registrar pago
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <span className="text-sm text-muted-foreground">Saldo pendiente</span>
        <span
          className={cn(
            "text-base font-semibold",
            balanceNum > 0 ? "text-amber-700" : "text-green-700",
          )}
        >
          {formatCurrency(balance, currency)}
        </span>
      </div>

      {isFormOpen && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentAmount">Monto</Label>
              <Input
                id="paymentAmount"
                type="number"
                min={0.01}
                max={balanceNum}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentDate">Fecha</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentMethod">Medio de pago</Label>
              <select
                id="paymentMethod"
                value={method}
                onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                {PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {PAYMENT_METHOD_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentReference">Referencia</Label>
              <Input
                id="paymentReference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Ej. Nº de comprobante"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentNotes">Notas</Label>
            <Input
              id="paymentNotes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={!isValid || isSaving} onClick={() => void handleCreate()}>
              {isSaving ? "Guardando..." : "Guardar pago"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">
                  {formatCurrency(payment.amount, currency)} ·{" "}
                  {PAYMENT_METHOD_LABELS[payment.method]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(payment.paidAt)}
                  {payment.reference && ` · Ref. ${payment.reference}`}
                  {payment.registeredBy && ` · ${payment.registeredBy.name}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(payment.id)}
                disabled={deletingId === payment.id}
                aria-label="Eliminar pago"
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                {deletingId === payment.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
