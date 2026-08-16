"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboSelect } from "@/components/work-orders/combo-select";
import { EquipmentCheckboxList } from "@/components/work-orders/equipment-checkbox-list";
import { QuoteItemEditor, EMPTY_QUOTE_ITEM, type QuoteItemDraft } from "./quote-item-editor";
import type { Client } from "@/lib/api/clients";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/document-type";
import type { Equipment } from "@/lib/api/equipments";
import type { SparePart } from "@/lib/api/spare-parts";
import type { Company } from "@/lib/api/company";
import type { Quote } from "@/lib/api/quotes";
import { formatCurrency } from "@/lib/format/currency";
import {
  createQuoteAction,
  updateQuoteAction,
  type QuoteClientSelection,
} from "@/app/(dashboard)/cotizaciones/actions";

interface NewClientDraft {
  name: string;
  documentType: DocumentType | "";
  documentNumber: string;
  phone: string;
  email: string;
  address: string;
}

const EMPTY_NEW_CLIENT: NewClientDraft = {
  name: "",
  documentType: "",
  documentNumber: "",
  phone: "",
  email: "",
  address: "",
};

interface QuoteFormProps {
  mode: "create" | "edit";
  quoteId?: string;
  clients: Client[];
  equipments: Equipment[];
  spareParts: SparePart[];
  company: Company;
  /** Solo en modo edit — la cotización YA está en DRAFT (el detalle no renderiza este form si no lo está). */
  initial?: Quote;
}

function itemsToDrafts(quote?: Quote): QuoteItemDraft[] {
  if (!quote) return [];
  return quote.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    sparePartId: item.sparePartId ?? undefined,
  }));
}

export function QuoteForm({
  mode,
  quoteId,
  clients,
  equipments,
  spareParts,
  company,
  initial,
}: QuoteFormProps) {
  const router = useRouter();

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initial?.clientId ?? null,
  );
  const [newClient, setNewClient] = useState<NewClientDraft>(EMPTY_NEW_CLIENT);

  const [siteName, setSiteName] = useState(initial?.siteName ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [scope, setScope] = useState(initial?.scope ?? "");
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>(
    initial?.equipments.map((e) => e.id) ?? [],
  );

  const [items, setItems] = useState<QuoteItemDraft[]>(() =>
    initial ? itemsToDrafts(initial) : [{ ...EMPTY_QUOTE_ITEM }],
  );

  const [discountAmount, setDiscountAmount] = useState(initial?.discountAmount ?? "0");
  const [paymentTerms, setPaymentTerms] = useState(
    initial?.paymentTerms ?? company.defaultPaymentTerms ?? "",
  );
  const [deliveryTime, setDeliveryTime] = useState(
    initial?.deliveryTime ?? company.defaultDeliveryTime ?? "",
  );
  const [warrantyTerms, setWarrantyTerms] = useState(
    initial?.warrantyTerms ?? company.defaultWarrantyTerms ?? "",
  );
  const [exclusions, setExclusions] = useState(
    initial?.exclusions ?? company.defaultExclusions ?? "",
  );
  const [validityDays, setValidityDays] = useState(
    String(initial?.validityDays ?? company.defaultValidityDays),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeClientId = clientMode === "existing" ? selectedClientId : null;
  const hasClient =
    clientMode === "existing"
      ? selectedClientId !== null
      : newClient.name.trim() !== "" &&
        newClient.documentType !== "" &&
        newClient.documentNumber.trim() !== "" &&
        newClient.phone.trim() !== "";

  const equipmentsForClient = useMemo(
    () => (activeClientId ? equipments.filter((e) => e.client.id === activeClientId) : []),
    [equipments, activeClientId],
  );

  const clientComboItems = useMemo(
    () =>
      clients.map((client) => ({
        id: client.id,
        label: client.name,
        hint:
          [
            client.documentType && client.documentNumber
              ? `${client.documentType} ${client.documentNumber}`
              : null,
            client.phone,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
      })),
    [clients],
  );

  const equipmentCheckboxItems = useMemo(
    () =>
      equipmentsForClient.map((equipment) => ({
        id: equipment.id,
        label: `${equipment.brand} ${equipment.model}`,
        hint: equipment.serialNumber ?? undefined,
      })),
    [equipmentsForClient],
  );

  function handleSelectClient(id: string) {
    setSelectedClientId(id);
    setSelectedEquipmentIds([]);
  }

  function handleClientModeChange(mode: "existing" | "new") {
    setClientMode(mode);
    setSelectedClientId(null);
    setSelectedEquipmentIds([]);
    if (mode === "new") setNewClient(EMPTY_NEW_CLIENT);
  }

  function updateNewClient(field: keyof NewClientDraft) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setNewClient((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  function toggleEquipment(id: string) {
    setSelectedEquipmentIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  }

  // Vista previa en vivo — misma fórmula que el backend (base = subtotal −
  // descuento, IVA sobre la base). Usa el IVA VIGENTE de la empresa: la
  // cotización todavía está en borrador, no hay nada congelado que respetar.
  const itemsTotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
    return sum + quantity * unitPrice;
  }, 0);
  const discount = Number(discountAmount) || 0;
  const base = Math.max(itemsTotal - discount, 0);
  const taxRate = Number(company.taxRate);
  const taxAmount = (base * taxRate) / 100;
  const total = base + taxAmount;

  const hasValidItems =
    items.length > 0 &&
    items.every(
      (item) =>
        item.description.trim() !== "" &&
        Number(item.quantity) > 0 &&
        Number.isFinite(Number(item.unitPrice)) &&
        Number(item.unitPrice) >= 0,
    );

  const validityDaysNumber = Number(validityDays);
  const isValidityDaysValid =
    validityDays.trim() !== "" &&
    Number.isInteger(validityDaysNumber) &&
    validityDaysNumber >= 1 &&
    validityDaysNumber <= 365;

  const isFormValid =
    hasClient &&
    title.trim() !== "" &&
    scope.trim() !== "" &&
    hasValidItems &&
    isValidityDaysValid &&
    !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);

    const itemsPayload = items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      sparePartId: item.sparePartId,
    }));

    if (mode === "create") {
      const clientPayload: QuoteClientSelection =
        clientMode === "existing"
          ? { mode: "existing", id: selectedClientId! }
          : {
              mode: "new",
              data: {
                name: newClient.name.trim(),
                documentType: newClient.documentType || undefined,
                documentNumber: newClient.documentNumber.trim() || undefined,
                phone: newClient.phone.trim() || undefined,
                email: newClient.email.trim() || undefined,
                address: newClient.address.trim() || undefined,
              },
            };

      const result = await createQuoteAction({
        client: clientPayload,
        title: title.trim(),
        siteName: siteName.trim() || undefined,
        scope: scope.trim(),
        equipmentIds: selectedEquipmentIds,
        items: itemsPayload,
        discountAmount: discount,
        paymentTerms: paymentTerms.trim() || undefined,
        deliveryTime: deliveryTime.trim() || undefined,
        warrantyTerms: warrantyTerms.trim() || undefined,
        exclusions: exclusions.trim() || undefined,
        validityDays: validityDaysNumber,
      });

      setIsSubmitting(false);
      if (!result.ok || !result.id) {
        toast.error(result.message ?? "No se pudo crear la cotización");
        return;
      }
      toast.success("Cotización creada");
      router.push(`/cotizaciones/${result.id}`);
      return;
    }

    // mode === "edit"
    const result = await updateQuoteAction(quoteId!, {
      clientId: clientMode === "existing" ? selectedClientId! : undefined,
      title: title.trim(),
      siteName: siteName.trim() || undefined,
      scope: scope.trim(),
      equipmentIds: selectedEquipmentIds,
      items: itemsPayload,
      discountAmount: discount,
      paymentTerms: paymentTerms.trim() || undefined,
      deliveryTime: deliveryTime.trim() || undefined,
      warrantyTerms: warrantyTerms.trim() || undefined,
      exclusions: exclusions.trim() || undefined,
      validityDays: validityDaysNumber,
    });

    setIsSubmitting(false);
    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar la cotización");
      return;
    }
    toast.success("Cotización actualizada");
    router.push(`/cotizaciones/${quoteId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={clientMode === "existing" ? "default" : "outline"}
              size="sm"
              onClick={() => handleClientModeChange("existing")}
            >
              Cliente existente
            </Button>
            <Button
              type="button"
              variant={clientMode === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => handleClientModeChange("new")}
            >
              Crear cliente nuevo
            </Button>
          </div>

          {clientMode === "existing" ? (
            <ComboSelect
              items={clientComboItems}
              selectedId={selectedClientId}
              onSelect={handleSelectClient}
              placeholder="Buscar cliente por nombre..."
              emptyMessage="No se encontraron clientes."
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientName">Nombre *</Label>
                <Input
                  id="clientName"
                  value={newClient.name}
                  onChange={updateNewClient("name")}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="documentType">Tipo de documento *</Label>
                  <select
                    id="documentType"
                    value={newClient.documentType}
                    onChange={updateNewClient("documentType")}
                    required
                    className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
                  >
                    <option value="">Sin especificar</option>
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DOCUMENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="documentNumber">Número de documento *</Label>
                  <Input
                    id="documentNumber"
                    value={newClient.documentNumber}
                    onChange={updateNewClient("documentNumber")}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clientPhone">Teléfono *</Label>
                  <Input
                    id="clientPhone"
                    value={newClient.phone}
                    onChange={updateNewClient("phone")}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clientEmail">Correo</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={newClient.email}
                    onChange={updateNewClient("email")}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="clientAddress">Dirección</Label>
                <Input
                  id="clientAddress"
                  value={newClient.address}
                  onChange={updateNewClient("address")}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cotización</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Suministro e instalación de motores"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="siteName">Sede o proyecto</Label>
            <Input
              id="siteName"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              placeholder="Ej. CC La Cuesta, Piedecuesta"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scope">Alcance *</Label>
            <textarea
              id="scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              rows={4}
              placeholder="Describe el trabajo propuesto"
              required
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          {hasClient && (
            <div className="flex flex-col gap-2">
              <Label>Equipos involucrados</Label>
              {equipmentCheckboxItems.length > 0 ? (
                <EquipmentCheckboxList
                  items={equipmentCheckboxItems}
                  selectedIds={selectedEquipmentIds}
                  onToggle={toggleEquipment}
                  placeholder="Buscar equipo por marca o modelo..."
                  emptyMessage="No se encontraron equipos."
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {clientMode === "existing"
                    ? "Este cliente no tiene equipos registrados todavía."
                    : "El cliente es nuevo: no tiene equipos registrados todavía."}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ítems</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteItemEditor
            items={items}
            onChange={setItems}
            spareParts={spareParts}
            currency={company.currency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condiciones comerciales</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discountAmount">Descuento</Label>
              <Input
                id="discountAmount"
                type="number"
                min={0}
                step="0.01"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="validityDays">Días de validez *</Label>
              <Input
                id="validityDays"
                type="number"
                min={1}
                max={365}
                step={1}
                value={validityDays}
                onChange={(event) => setValidityDays(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentTerms">Forma de pago</Label>
            <Input
              id="paymentTerms"
              value={paymentTerms}
              onChange={(event) => setPaymentTerms(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deliveryTime">Tiempo de entrega</Label>
            <Input
              id="deliveryTime"
              value={deliveryTime}
              onChange={(event) => setDeliveryTime(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warrantyTerms">Garantía</Label>
            <Input
              id="warrantyTerms"
              value={warrantyTerms}
              onChange={(event) => setWarrantyTerms(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="exclusions">Exclusiones</Label>
            <Input
              id="exclusions"
              value={exclusions}
              onChange={(event) => setExclusions(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="text-foreground">{formatCurrency(itemsTotal, company.currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Descuento</span>
                <span className="text-foreground">
                  − {formatCurrency(discount, company.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>IVA ({taxRate}%)</span>
              <span className="text-foreground">{formatCurrency(taxAmount, company.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrency(total, company.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={!isFormValid} className="w-full md:w-auto md:self-end">
        {isSubmitting
          ? "Guardando..."
          : mode === "create"
            ? "Crear borrador"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
