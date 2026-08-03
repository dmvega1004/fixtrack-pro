"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import type { Client } from "@/lib/api/clients";
import { createClientAction, updateClientAction } from "@/app/(dashboard)/clientes/actions";

interface ClientFormProps {
  mode: "create" | "edit";
  clientId?: string;
  initial?: Client;
}

export function ClientForm({ mode, clientId, initial }: ClientFormProps) {
  const router = useRouter();

  const initialDocumentType = (initial?.documentType as DocumentType | null) ?? "";
  const initialDocumentNumber = initial?.documentNumber ?? "";
  const initialPhone = initial?.phone ?? "";

  const [name, setName] = useState(initial?.name ?? "");
  const [documentType, setDocumentType] = useState<DocumentType | "">(initialDocumentType);
  const [documentNumber, setDocumentNumber] = useState(initialDocumentNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [isSaving, setIsSaving] = useState(false);

  /**
   * En edición, un cliente antiguo puede no tener documento/teléfono cargados.
   * No lo forzamos a completarlos si no los toca; si empieza a escribir en el
   * campo pasa a ser obligatorio, y vuelve a ser opcional si lo deja como estaba.
   */
  function isRequiredNow(current: string, initialValue: string) {
    return mode === "create" || initialValue.trim() !== "" || current.trim() !== initialValue.trim();
  }

  const documentTypeRequired = isRequiredNow(documentType, initialDocumentType);
  const documentNumberRequired = isRequiredNow(documentNumber, initialDocumentNumber);
  const phoneRequired = isRequiredNow(phone, initialPhone);

  const isValid =
    name.trim() !== "" &&
    (!documentTypeRequired || documentType !== "") &&
    (!documentNumberRequired || documentNumber.trim() !== "") &&
    (!phoneRequired || phone.trim() !== "") &&
    !isSaving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    const dto = {
      name: name.trim(),
      documentType: documentType || undefined,
      documentNumber: documentNumber.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    };

    const result =
      mode === "create"
        ? await createClientAction(dto)
        : await updateClientAction(clientId!, dto);
    setIsSaving(false);

    if (!result.ok || !result.id) {
      toast.error(result.message ?? "No se pudo guardar el cliente");
      return;
    }

    toast.success(mode === "create" ? "Cliente creado" : "Cliente actualizado");
    router.push(`/clientes/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="documentType">Tipo de documento *</Label>
              <select
                id="documentType"
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as DocumentType | "")
                }
                required={documentTypeRequired}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                <option value="">Sin especificar</option>
                {DOCUMENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {DOCUMENT_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="documentNumber">Número de documento *</Label>
              <Input
                id="documentNumber"
                value={documentNumber}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDocumentNumber(event.target.value)
                }
                required={documentNumberRequired}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
                required={phoneRequired}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={address}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setAddress(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={!isValid} className="w-full md:w-auto md:self-end">
        {isSaving ? "Guardando..." : mode === "create" ? "Crear cliente" : "Guardar cambios"}
      </Button>
    </form>
  );
}
