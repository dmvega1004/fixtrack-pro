"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboSelect } from "./combo-select";
import { EquipmentCheckboxList } from "./equipment-checkbox-list";
import type { Client } from "@/lib/api/clients";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/document-type";
import type { Equipment } from "@/lib/api/equipments";
import type { Technician } from "@/lib/api/users";
import {
  PRIORITY_LABELS,
  type Priority,
} from "@/components/shared/priority-badge";
import {
  SERVICE_TYPE_LABELS,
  type ServiceType,
} from "@/components/shared/service-type-badge";
import { formatOrderNumber } from "@/lib/format/order-number";
import { createWorkOrderChainedAction } from "@/app/(dashboard)/ordenes/nueva/actions";

const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];
const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];
const UNASSIGNED_VALUE = "";

interface NewClientDraft {
  name: string;
  documentType: DocumentType | "";
  documentNumber: string;
  phone: string;
  email: string;
  address: string;
}

interface NewEquipmentDraft {
  brand: string;
  model: string;
  serialNumber: string;
  location: string;
}

const EMPTY_NEW_CLIENT: NewClientDraft = {
  name: "",
  documentType: "",
  documentNumber: "",
  phone: "",
  email: "",
  address: "",
};

const EMPTY_NEW_EQUIPMENT: NewEquipmentDraft = {
  brand: "",
  model: "",
  serialNumber: "",
  location: "",
};

/** Etiqueta unificada en la selección: un equipo ya existente o uno nuevo aún sin crear. */
type EquipmentTag =
  | { key: string; kind: "existing"; id: string; label: string }
  | { key: string; kind: "draft"; index: number; label: string };

interface NewOrderFormProps {
  clients: Client[];
  equipments: Equipment[];
  technicians: Technician[];
  canAssign: boolean;
  /** Preselección desde /ordenes/nueva?equipo=id o ?equipos=id1,id2,... (ficha de equipo o "Programar mantenimiento"). */
  initialClientId?: string;
  initialEquipmentIds?: string[];
  /** "Programar mantenimiento" precarga PREVENTIVE; el usuario puede cambiarlo. */
  initialServiceType?: ServiceType;
  /** Descripción sugerida (ej. desde "Programar mantenimiento") — editable, nunca se crea la orden sin que el usuario la revise. */
  initialDescription?: string;
}

export function NewOrderForm({
  clients,
  equipments,
  technicians,
  canAssign,
  initialClientId,
  initialEquipmentIds,
  initialServiceType,
  initialDescription,
}: NewOrderFormProps) {
  const router = useRouter();

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialClientId ?? null,
  );
  const [newClient, setNewClient] = useState<NewClientDraft>(EMPTY_NEW_CLIENT);

  const [equipmentSectionMode, setEquipmentSectionMode] = useState<
    "selection" | "none"
  >("selection");
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>(
    initialEquipmentIds ?? [],
  );
  const [draftEquipments, setDraftEquipments] = useState<NewEquipmentDraft[]>([]);
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [newEquipmentDraft, setNewEquipmentDraft] =
    useState<NewEquipmentDraft>(EMPTY_NEW_EQUIPMENT);

  const [description, setDescription] = useState(initialDescription ?? "");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [serviceType, setServiceType] = useState<ServiceType>(
    initialServiceType ?? "CORRECTIVE",
  );
  const [assignedUserId, setAssignedUserId] = useState(UNASSIGNED_VALUE);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasClient =
    clientMode === "existing"
      ? selectedClientId !== null
      : newClient.name.trim() !== "" &&
        newClient.documentType !== "" &&
        newClient.documentNumber.trim() !== "" &&
        newClient.phone.trim() !== "";

  const activeClientId = clientMode === "existing" ? selectedClientId : null;

  const equipmentsForClient = useMemo(
    () =>
      activeClientId
        ? equipments.filter((equipment) => equipment.client.id === activeClientId)
        : [],
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

  const equipmentTags: EquipmentTag[] = useMemo(() => {
    const existingTags: EquipmentTag[] = selectedEquipmentIds
      .map((id) => equipmentCheckboxItems.find((item) => item.id === id))
      .filter((item): item is (typeof equipmentCheckboxItems)[number] => item !== undefined)
      .map((item) => ({ key: `existing-${item.id}`, kind: "existing", id: item.id, label: item.label }));

    const draftTags: EquipmentTag[] = draftEquipments.map((draft, index) => ({
      key: `draft-${index}`,
      kind: "draft",
      index,
      label: `${draft.brand} ${draft.model} (nuevo)`,
    }));

    return [...existingTags, ...draftTags];
  }, [selectedEquipmentIds, equipmentCheckboxItems, draftEquipments]);

  function handleSelectClient(id: string) {
    setSelectedClientId(id);
    setSelectedEquipmentIds([]);
    setDraftEquipments([]);
    setEquipmentSectionMode("selection");
    setIsAddingEquipment(false);
  }

  function handleClientModeChange(mode: "existing" | "new") {
    setClientMode(mode);
    setSelectedClientId(null);
    setSelectedEquipmentIds([]);
    setDraftEquipments([]);
    setEquipmentSectionMode("selection");
    setIsAddingEquipment(false);
    if (mode === "new") {
      setNewClient(EMPTY_NEW_CLIENT);
    }
  }

  function updateNewClient(field: keyof NewClientDraft) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setNewClient((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  function toggleEquipment(id: string) {
    setSelectedEquipmentIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id],
    );
  }

  function updateNewEquipmentDraft(field: keyof NewEquipmentDraft) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setNewEquipmentDraft((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  const canAddDraftEquipment =
    newEquipmentDraft.brand.trim() !== "" && newEquipmentDraft.model.trim() !== "";

  function handleAddDraftEquipment() {
    if (!canAddDraftEquipment) return;
    setDraftEquipments((current) => [
      ...current,
      {
        brand: newEquipmentDraft.brand.trim(),
        model: newEquipmentDraft.model.trim(),
        serialNumber: newEquipmentDraft.serialNumber.trim(),
        location: newEquipmentDraft.location.trim(),
      },
    ]);
    setNewEquipmentDraft(EMPTY_NEW_EQUIPMENT);
    setIsAddingEquipment(false);
  }

  function removeEquipmentTag(tag: EquipmentTag) {
    if (tag.kind === "existing") {
      setSelectedEquipmentIds((current) => current.filter((id) => id !== tag.id));
    } else {
      setDraftEquipments((current) => current.filter((_, index) => index !== tag.index));
    }
  }

  const isFormValid = hasClient && description.trim() !== "" && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);

    const clientPayload =
      clientMode === "existing"
        ? ({ mode: "existing", id: selectedClientId! } as const)
        : ({
            mode: "new",
            data: {
              name: newClient.name.trim(),
              documentType: newClient.documentType || undefined,
              documentNumber: newClient.documentNumber.trim() || undefined,
              phone: newClient.phone.trim() || undefined,
              email: newClient.email.trim() || undefined,
              address: newClient.address.trim() || undefined,
            },
          } as const);

    const equipmentPayload =
      equipmentSectionMode === "none"
        ? ({ mode: "none" } as const)
        : ({
            mode: "selection",
            existingIds: selectedEquipmentIds,
            newEquipment: draftEquipments.map((draft) => ({
              brand: draft.brand,
              model: draft.model,
              serialNumber: draft.serialNumber || undefined,
              location: draft.location || undefined,
            })),
          } as const);

    const result = await createWorkOrderChainedAction({
      client: clientPayload,
      equipment: equipmentPayload,
      description: description.trim(),
      priority,
      serviceType,
      userId: canAssign && assignedUserId ? assignedUserId : undefined,
    });

    setIsSubmitting(false);

    if (!result.ok || !result.orderId) {
      toast.error(result.message ?? "No se pudo crear la orden");
      return;
    }

    toast.success(`Orden ${formatOrderNumber(result.orderNumber!)} creada`);
    router.push(`/ordenes/${result.orderId}`);
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
                  placeholder="Nombre del cliente"
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
          <CardTitle>Equipos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!hasClient ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              Selecciona o crea un cliente primero.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={equipmentSectionMode === "selection" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEquipmentSectionMode("selection")}
                >
                  Seleccionar equipos
                </Button>
                <Button
                  type="button"
                  variant={equipmentSectionMode === "none" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEquipmentSectionMode("none")}
                >
                  Servicio sin equipo (locativo)
                </Button>
              </div>

              {equipmentSectionMode === "none" && (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  La orden quedará asociada solo al cliente — para servicios
                  locativos como sellado de paredes, limpieza de fachada,
                  cambio de bombillos o instalación de vitrinas.
                </p>
              )}

              {equipmentSectionMode === "selection" && (
                <div className="flex flex-col gap-3">
                  {equipmentTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {equipmentTags.map((tag) => (
                        <span
                          key={tag.key}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        >
                          {tag.label}
                          <button
                            type="button"
                            onClick={() => removeEquipmentTag(tag)}
                            aria-label={`Quitar ${tag.label}`}
                            className="rounded-full hover:bg-primary/20"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

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

                  {isAddingEquipment ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="draftBrand">Marca *</Label>
                          <Input
                            id="draftBrand"
                            value={newEquipmentDraft.brand}
                            onChange={updateNewEquipmentDraft("brand")}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="draftModel">Modelo *</Label>
                          <Input
                            id="draftModel"
                            value={newEquipmentDraft.model}
                            onChange={updateNewEquipmentDraft("model")}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="draftSerialNumber">Número de serie</Label>
                        <Input
                          id="draftSerialNumber"
                          value={newEquipmentDraft.serialNumber}
                          onChange={updateNewEquipmentDraft("serialNumber")}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="draftLocation">Ubicación</Label>
                        <Input
                          id="draftLocation"
                          value={newEquipmentDraft.location}
                          onChange={updateNewEquipmentDraft("location")}
                          placeholder="Ej. CC La Cuesta, Piedecuesta — Local AME2170 Americanino"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        El código QR se genera automáticamente al crear el equipo.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!canAddDraftEquipment}
                          onClick={handleAddDraftEquipment}
                        >
                          Agregar a la orden
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsAddingEquipment(false);
                            setNewEquipmentDraft(EMPTY_NEW_EQUIPMENT);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() => setIsAddingEquipment(true)}
                    >
                      Crear equipo nuevo
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Servicio</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descripción del servicio/problema *</Label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Describe el problema reportado o el servicio a realizar"
              required
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serviceType">Tipo de servicio</Label>
              <select
                id="serviceType"
                value={serviceType}
                onChange={(event) => setServiceType(event.target.value as ServiceType)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                {SERVICE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {SERVICE_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Prioridad</Label>
              <select
                id="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {canAssign && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assignedUserId">Técnico asignado</Label>
              <select
                id="assignedUserId"
                value={assignedUserId}
                onChange={(event) => setAssignedUserId(event.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                <option value={UNASSIGNED_VALUE}>Sin asignar</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={!isFormValid}
        className="w-full md:w-auto md:self-end"
      >
        {isSubmitting ? "Creando orden..." : "Crear orden"}
      </Button>
    </form>
  );
}
