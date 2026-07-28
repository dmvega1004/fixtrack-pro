"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboSelect } from "./combo-select";
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
import { formatOrderNumber } from "@/lib/format/order-number";
import { createWorkOrderChainedAction } from "@/app/(dashboard)/ordenes/nueva/actions";

const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];
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
};

interface NewOrderFormProps {
  clients: Client[];
  equipments: Equipment[];
  technicians: Technician[];
  canAssign: boolean;
}

export function NewOrderForm({
  clients,
  equipments,
  technicians,
  canAssign,
}: NewOrderFormProps) {
  const router = useRouter();

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<NewClientDraft>(EMPTY_NEW_CLIENT);

  const [equipmentMode, setEquipmentMode] = useState<"existing" | "new">(
    "existing",
  );
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<
    string | null
  >(null);
  const [newEquipment, setNewEquipment] =
    useState<NewEquipmentDraft>(EMPTY_NEW_EQUIPMENT);

  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assignedUserId, setAssignedUserId] = useState(UNASSIGNED_VALUE);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasClient =
    clientMode === "existing"
      ? selectedClientId !== null
      : newClient.name.trim() !== "";

  const activeClientId = clientMode === "existing" ? selectedClientId : null;

  const equipmentsForClient = useMemo(
    () =>
      activeClientId
        ? equipments.filter((equipment) => equipment.client.id === activeClientId)
        : [],
    [equipments, activeClientId],
  );

  const canPickExistingEquipment =
    clientMode === "existing" && equipmentsForClient.length > 0;
  const effectiveEquipmentMode: "existing" | "new" = canPickExistingEquipment
    ? equipmentMode
    : "new";

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

  const equipmentComboItems = useMemo(
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
    setSelectedEquipmentId(null);
    setEquipmentMode("existing");
  }

  function handleClientModeChange(mode: "existing" | "new") {
    setClientMode(mode);
    setSelectedClientId(null);
    setSelectedEquipmentId(null);
    setEquipmentMode("existing");
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

  function updateNewEquipment(field: keyof NewEquipmentDraft) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setNewEquipment((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  const equipmentValid =
    effectiveEquipmentMode === "existing"
      ? selectedEquipmentId !== null
      : newEquipment.brand.trim() !== "" && newEquipment.model.trim() !== "";

  const isFormValid =
    hasClient &&
    equipmentValid &&
    description.trim() !== "" &&
    !isSubmitting;

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
      effectiveEquipmentMode === "existing"
        ? ({ mode: "existing", id: selectedEquipmentId! } as const)
        : ({
            mode: "new",
            data: {
              brand: newEquipment.brand.trim(),
              model: newEquipment.model.trim(),
              serialNumber: newEquipment.serialNumber.trim() || undefined,
            },
          } as const);

    const result = await createWorkOrderChainedAction({
      client: clientPayload,
      equipment: equipmentPayload,
      description: description.trim(),
      priority,
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
                  <Label htmlFor="documentType">Tipo de documento</Label>
                  <select
                    id="documentType"
                    value={newClient.documentType}
                    onChange={updateNewClient("documentType")}
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
                  <Label htmlFor="documentNumber">Número de documento</Label>
                  <Input
                    id="documentNumber"
                    value={newClient.documentNumber}
                    onChange={updateNewClient("documentNumber")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clientPhone">Teléfono</Label>
                  <Input
                    id="clientPhone"
                    value={newClient.phone}
                    onChange={updateNewClient("phone")}
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
          <CardTitle>Equipo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!hasClient ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              Selecciona o crea un cliente primero.
            </p>
          ) : (
            <>
              {canPickExistingEquipment && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={equipmentMode === "existing" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEquipmentMode("existing")}
                  >
                    Equipo existente
                  </Button>
                  <Button
                    type="button"
                    variant={equipmentMode === "new" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEquipmentMode("new")}
                  >
                    Crear equipo nuevo
                  </Button>
                </div>
              )}

              {clientMode === "existing" &&
                equipmentsForClient.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Este cliente no tiene equipos registrados. Completa los
                    datos del equipo nuevo.
                  </p>
                )}

              {effectiveEquipmentMode === "existing" ? (
                <ComboSelect
                  items={equipmentComboItems}
                  selectedId={selectedEquipmentId}
                  onSelect={setSelectedEquipmentId}
                  placeholder="Buscar equipo por marca o modelo..."
                  emptyMessage="No se encontraron equipos."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="brand">Marca *</Label>
                      <Input
                        id="brand"
                        value={newEquipment.brand}
                        onChange={updateNewEquipment("brand")}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="model">Modelo *</Label>
                      <Input
                        id="model"
                        value={newEquipment.model}
                        onChange={updateNewEquipment("model")}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="serialNumber">Número de serie</Label>
                    <Input
                      id="serialNumber"
                      value={newEquipment.serialNumber}
                      onChange={updateNewEquipment("serialNumber")}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El código QR se genera automáticamente al crear el equipo.
                  </p>
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
