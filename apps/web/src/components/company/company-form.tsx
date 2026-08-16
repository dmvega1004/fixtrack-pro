"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Company } from "@/lib/api/company";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/currency";
import { saveCompanyAction } from "@/app/(dashboard)/empresa/actions";

interface UploadErrorBody {
  message?: string;
}

interface CompanyFormState {
  name: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  currency: Currency;
  taxRate: string;
  collectionDocTitle: string;
  payeeName: string;
  payeeDocument: string;
  bankName: string;
  bankAccount: string;
  signerName: string;
  signerRole: string;
  collectionDocFootnote: string;
  nextCollectionNumber: string;
  nextQuoteNumber: string;
  defaultPaymentTerms: string;
  defaultDeliveryTime: string;
  defaultWarrantyTerms: string;
  defaultExclusions: string;
  defaultValidityDays: string;
  quoteFollowUpDays: string;
  quoteFootnote: string;
}

function toFormState(company: Company): CompanyFormState {
  return {
    name: company.name,
    slogan: company.slogan ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    address: company.address ?? "",
    website: company.website ?? "",
    currency: (company.currency as Currency) ?? "COP",
    taxRate: company.taxRate,
    collectionDocTitle: company.collectionDocTitle,
    payeeName: company.payeeName ?? "",
    payeeDocument: company.payeeDocument ?? "",
    bankName: company.bankName ?? "",
    bankAccount: company.bankAccount ?? "",
    signerName: company.signerName ?? "",
    signerRole: company.signerRole ?? "",
    collectionDocFootnote: company.collectionDocFootnote ?? "",
    nextCollectionNumber: String(company.nextCollectionNumber),
    nextQuoteNumber: String(company.nextQuoteNumber),
    defaultPaymentTerms: company.defaultPaymentTerms ?? "",
    defaultDeliveryTime: company.defaultDeliveryTime ?? "",
    defaultWarrantyTerms: company.defaultWarrantyTerms ?? "",
    defaultExclusions: company.defaultExclusions ?? "",
    defaultValidityDays: String(company.defaultValidityDays),
    quoteFollowUpDays: String(company.quoteFollowUpDays),
    quoteFootnote: company.quoteFootnote ?? "",
  };
}

interface CompanyFormProps {
  company: Company;
}

export function CompanyForm({ company }: CompanyFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CompanyFormState>(() => toFormState(company));
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(company.logoUrl);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data as UploadErrorBody | null)?.message;
        toast.error(message ?? "No se pudo subir el logo");
        return;
      }

      setLogoUrl((data as Company).logoUrl);
      toast.success("Logo actualizado");
      router.refresh();
    } catch {
      toast.error("No se pudo subir el logo");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  function updateField(field: keyof CompanyFormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  const taxRate = Number(form.taxRate);
  const isTaxRateValid =
    form.taxRate.trim() !== "" && !Number.isNaN(taxRate) && taxRate >= 0 && taxRate <= 100;

  const nextCollectionNumber = Number(form.nextCollectionNumber);
  const isNextCollectionNumberValid =
    form.nextCollectionNumber.trim() !== "" &&
    Number.isInteger(nextCollectionNumber) &&
    nextCollectionNumber >= 1;

  const nextQuoteNumber = Number(form.nextQuoteNumber);
  const isNextQuoteNumberValid =
    form.nextQuoteNumber.trim() !== "" &&
    Number.isInteger(nextQuoteNumber) &&
    nextQuoteNumber >= 1;

  const defaultValidityDays = Number(form.defaultValidityDays);
  const isDefaultValidityDaysValid =
    form.defaultValidityDays.trim() !== "" &&
    Number.isInteger(defaultValidityDays) &&
    defaultValidityDays >= 1 &&
    defaultValidityDays <= 365;

  const quoteFollowUpDays = Number(form.quoteFollowUpDays);
  const isQuoteFollowUpDaysValid =
    form.quoteFollowUpDays.trim() !== "" &&
    Number.isInteger(quoteFollowUpDays) &&
    quoteFollowUpDays >= 1 &&
    quoteFollowUpDays <= 365;

  const isQuoteSectionValid =
    isNextQuoteNumberValid && isDefaultValidityDaysValid && isQuoteFollowUpDaysValid;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !isTaxRateValid ||
      !isNextCollectionNumberValid ||
      !isQuoteSectionValid
    )
      return;

    setIsSaving(true);
    const result = await saveCompanyAction({
      name: form.name.trim(),
      slogan: form.slogan.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      website: form.website.trim() || undefined,
      currency: form.currency,
      taxRate,
      collectionDocTitle: form.collectionDocTitle.trim() || undefined,
      payeeName: form.payeeName.trim() || undefined,
      payeeDocument: form.payeeDocument.trim() || undefined,
      bankName: form.bankName.trim() || undefined,
      bankAccount: form.bankAccount.trim() || undefined,
      signerName: form.signerName.trim() || undefined,
      signerRole: form.signerRole.trim() || undefined,
      collectionDocFootnote: form.collectionDocFootnote.trim() || undefined,
      nextCollectionNumber,
      nextQuoteNumber,
      defaultPaymentTerms: form.defaultPaymentTerms.trim() || undefined,
      defaultDeliveryTime: form.defaultDeliveryTime.trim() || undefined,
      defaultWarrantyTerms: form.defaultWarrantyTerms.trim() || undefined,
      defaultExclusions: form.defaultExclusions.trim() || undefined,
      defaultValidityDays,
      quoteFollowUpDays,
      quoteFootnote: form.quoteFootnote.trim() || undefined,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudieron guardar los datos");
      return;
    }

    if (result.warning) {
      toast.warning(result.warning);
    } else {
      toast.success("Datos de la empresa actualizados");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre de la empresa *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={updateField("name")}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slogan">Eslogan</Label>
            <Input
              id="slogan"
              value={form.slogan}
              onChange={updateField("slogan")}
              placeholder="Una frase corta que te describa"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={form.phone} onChange={updateField("phone")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={updateField("email")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={form.address} onChange={updateField("address")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="website">Sitio web</Label>
            <Input
              id="website"
              type="url"
              value={form.website}
              onChange={updateField("website")}
              placeholder="https://tuempresa.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Moneda</Label>
              <select
                id="currency"
                value={form.currency}
                onChange={updateField("currency")}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {CURRENCY_LABELS[currency]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taxRate">Tarifa de IVA (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.taxRate}
                onChange={updateField("taxRate")}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Se aplica a las órdenes de trabajo al valorizarlas. Deja 0 si tu
            empresa no es responsable de IVA.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logo">Logo de la empresa</Label>
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {isUploadingLogo ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logo remoto en Cloudinary, sin dominio fijo que declarar
                  <img
                    src={logoUrl}
                    alt={form.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Sin logo
                  </span>
                )}
              </div>
              <input
                ref={logoInputRef}
                id="logo"
                type="file"
                accept="image/*"
                onChange={(event) => void handleLogoChange(event)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
              >
                {isUploadingLogo
                  ? "Subiendo..."
                  : logoUrl
                    ? "Cambiar logo"
                    : "Subir logo"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Aparece en el membrete de las órdenes que imprimes o compartes
              con tus clientes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documento de cobro</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="collectionDocTitle">Título del documento</Label>
            <Input
              id="collectionDocTitle"
              value={form.collectionDocTitle}
              onChange={updateField("collectionDocTitle")}
              placeholder="Cuenta de cobro"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payeeName">Beneficiario del pago</Label>
              <Input
                id="payeeName"
                value={form.payeeName}
                onChange={updateField("payeeName")}
                placeholder={form.name || "Nombre de la empresa por defecto"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payeeDocument">Documento del beneficiario</Label>
              <Input
                id="payeeDocument"
                value={form.payeeDocument}
                onChange={updateField("payeeDocument")}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Deja el beneficiario vacío para usar el nombre de la empresa. Solo
            complétalo si el pago se recibe a nombre de alguien distinto.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bankName">Entidad bancaria</Label>
              <Input id="bankName" value={form.bankName} onChange={updateField("bankName")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bankAccount">Número de cuenta</Label>
              <Input
                id="bankAccount"
                value={form.bankAccount}
                onChange={updateField("bankAccount")}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signerName">Nombre del firmante</Label>
              <Input
                id="signerName"
                value={form.signerName}
                onChange={updateField("signerName")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signerRole">Cargo del firmante</Label>
              <Input
                id="signerRole"
                value={form.signerRole}
                onChange={updateField("signerRole")}
                placeholder="Ej. Gerente"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Si dejas el firmante vacío, el documento no muestra recuadro de firma.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="collectionDocFootnote">Nota al pie</Label>
            <Input
              id="collectionDocFootnote"
              value={form.collectionDocFootnote}
              onChange={updateField("collectionDocFootnote")}
              placeholder="Este documento constituye una solicitud de pago y no equivale a factura electrónica de venta."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nextCollectionNumber">
              Numeración: próximo consecutivo a asignar
            </Label>
            <Input
              id="nextCollectionNumber"
              type="number"
              min={1}
              step={1}
              value={form.nextCollectionNumber}
              onChange={updateField("nextCollectionNumber")}
            />
            <p className="text-xs text-muted-foreground">
              Solo aplica a los próximos documentos que generes — no cambia el
              número de las cuentas de cobro ya emitidas.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Condiciones comerciales por defecto de una cotización nueva —
            se copian a cada cotización al crearla y son editables ahí
            mientras siga en borrador.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultPaymentTerms">Forma de pago</Label>
            <Input
              id="defaultPaymentTerms"
              value={form.defaultPaymentTerms}
              onChange={updateField("defaultPaymentTerms")}
              placeholder="Ej. 50% anticipo, 50% contra entrega"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultDeliveryTime">Tiempo de entrega</Label>
              <Input
                id="defaultDeliveryTime"
                value={form.defaultDeliveryTime}
                onChange={updateField("defaultDeliveryTime")}
                placeholder="Ej. 8 días hábiles"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultWarrantyTerms">Garantía</Label>
              <Input
                id="defaultWarrantyTerms"
                value={form.defaultWarrantyTerms}
                onChange={updateField("defaultWarrantyTerms")}
                placeholder="Ej. 12 meses por defectos de fabricación"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultExclusions">Exclusiones</Label>
            <Input
              id="defaultExclusions"
              value={form.defaultExclusions}
              onChange={updateField("defaultExclusions")}
              placeholder="Ej. No incluye obra civil"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="defaultValidityDays">Días de validez</Label>
              <Input
                id="defaultValidityDays"
                type="number"
                min={1}
                max={365}
                step={1}
                value={form.defaultValidityDays}
                onChange={updateField("defaultValidityDays")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quoteFollowUpDays">
                Días para el recordatorio de seguimiento
              </Label>
              <Input
                id="quoteFollowUpDays"
                type="number"
                min={1}
                max={365}
                step={1}
                value={form.quoteFollowUpDays}
                onChange={updateField("quoteFollowUpDays")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quoteFootnote">Nota al pie</Label>
            <Input
              id="quoteFootnote"
              value={form.quoteFootnote}
              onChange={updateField("quoteFootnote")}
              placeholder="Ej. Precios sujetos a cambio sin previo aviso."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nextQuoteNumber">
              Numeración: próximo consecutivo a asignar
            </Label>
            <Input
              id="nextQuoteNumber"
              type="number"
              min={1}
              step={1}
              value={form.nextQuoteNumber}
              onChange={updateField("nextQuoteNumber")}
            />
            <p className="text-xs text-muted-foreground">
              Se consume recién cuando se ENVÍA una cotización, no cuando se
              crea el borrador.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={
          isSaving ||
          !form.name.trim() ||
          !isTaxRateValid ||
          !isNextCollectionNumberValid ||
          !isQuoteSectionValid
        }
        className="w-full md:w-auto md:self-end"
      >
        {isSaving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
