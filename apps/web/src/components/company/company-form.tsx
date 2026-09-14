"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Company } from "@/lib/api/company";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/currency";
import { saveCompanyAction } from "@/app/(dashboard)/empresa/actions";
import { LetterheadPreview } from "@/components/company/letterhead-preview";

/** Mismo azul que PRINT_BRAND_BLUE (print-letterhead.tsx) — valor por
 * defecto del selector cuando la empresa no ha configurado ninguno, mismo
 * criterio que DEFAULT_ACCENT_COLOR en client-form.tsx. */
const DEFAULT_ACCENT_COLOR = "#2563EB";

interface UploadErrorBody {
  message?: string;
}

interface CompanyFormState {
  name: string;
  slogan: string;
  taxId: string;
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
  defaultMethodology: string;
  defaultValidityDays: string;
  quoteFollowUpDays: string;
  quoteFootnote: string;
  signatureInCollection: boolean;
  signatureInQuote: boolean;
  letterheadAccentColor: string;
  letterheadWorkOrderDocCode: string;
  letterheadWorkOrderDocVersion: string;
  letterheadWorkOrderDocDate: string;
  letterheadQuoteDocCode: string;
  letterheadQuoteDocVersion: string;
  letterheadQuoteDocDate: string;
  letterheadCollectionDocCode: string;
  letterheadCollectionDocVersion: string;
  letterheadCollectionDocDate: string;
  letterheadFooterText: string;
  letterheadShowFixtrackBranding: boolean;
}

function toFormState(company: Company): CompanyFormState {
  return {
    name: company.name,
    slogan: company.slogan ?? "",
    taxId: company.taxId ?? "",
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
    defaultMethodology: company.defaultMethodology ?? "",
    defaultValidityDays: String(company.defaultValidityDays),
    quoteFollowUpDays: String(company.quoteFollowUpDays),
    quoteFootnote: company.quoteFootnote ?? "",
    signatureInCollection: company.signatureInCollection,
    signatureInQuote: company.signatureInQuote,
    letterheadAccentColor: company.letterheadAccentColor ?? DEFAULT_ACCENT_COLOR,
    letterheadWorkOrderDocCode: company.letterheadWorkOrderDocCode ?? "",
    letterheadWorkOrderDocVersion: company.letterheadWorkOrderDocVersion ?? "",
    letterheadWorkOrderDocDate: company.letterheadWorkOrderDocDate ?? "",
    letterheadQuoteDocCode: company.letterheadQuoteDocCode ?? "",
    letterheadQuoteDocVersion: company.letterheadQuoteDocVersion ?? "",
    letterheadQuoteDocDate: company.letterheadQuoteDocDate ?? "",
    letterheadCollectionDocCode: company.letterheadCollectionDocCode ?? "",
    letterheadCollectionDocVersion: company.letterheadCollectionDocVersion ?? "",
    letterheadCollectionDocDate: company.letterheadCollectionDocDate ?? "",
    letterheadFooterText: company.letterheadFooterText ?? "",
    letterheadShowFixtrackBranding: company.letterheadShowFixtrackBranding,
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
  const [signatureUrl, setSignatureUrl] = useState(company.signatureImageUrl);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSignatureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "image/png") {
      toast.error("La firma debe ser una imagen PNG");
      return;
    }

    setIsUploadingSignature(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/signature", {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data as UploadErrorBody | null)?.message;
        toast.error(message ?? "No se pudo subir la firma");
        return;
      }

      setSignatureUrl((data as Company).signatureImageUrl);
      toast.success("Firma actualizada");
      router.refresh();
    } catch {
      toast.error("No se pudo subir la firma");
    } finally {
      setIsUploadingSignature(false);
    }
  }

  function updateField(field: keyof CompanyFormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  // Defecto silencioso: en los documentos, TODO el bloque de firma (línea +
  // imagen + nombre) está condicionado a signerName — correcto, una firma
  // sin nombre de quien firma no sirve. Lo que falta es avisarlo ACÁ, al
  // configurar, en vez de que el ADMIN lo descubra con el documento ya
  // generado y sin firma. Dispara con imagen cargada O alguna casilla
  // activada — cualquiera de las dos sin el nombre es tiempo perdido.
  const wantsSignatureStamped = Boolean(signatureUrl) || form.signatureInCollection || form.signatureInQuote;
  const signatureWontStamp = wantsSignatureStamped && !form.signerName.trim();

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
      taxId: form.taxId.trim() || undefined,
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
      signatureInCollection: form.signatureInCollection,
      signatureInQuote: form.signatureInQuote,
      nextCollectionNumber,
      nextQuoteNumber,
      defaultPaymentTerms: form.defaultPaymentTerms.trim() || undefined,
      defaultDeliveryTime: form.defaultDeliveryTime.trim() || undefined,
      defaultWarrantyTerms: form.defaultWarrantyTerms.trim() || undefined,
      defaultExclusions: form.defaultExclusions.trim() || undefined,
      defaultMethodology: form.defaultMethodology.trim() || undefined,
      defaultValidityDays,
      quoteFollowUpDays,
      quoteFootnote: form.quoteFootnote.trim() || undefined,
      letterheadAccentColor: form.letterheadAccentColor || undefined,
      letterheadWorkOrderDocCode: form.letterheadWorkOrderDocCode.trim() || undefined,
      letterheadWorkOrderDocVersion: form.letterheadWorkOrderDocVersion.trim() || undefined,
      letterheadWorkOrderDocDate: form.letterheadWorkOrderDocDate.trim() || undefined,
      letterheadQuoteDocCode: form.letterheadQuoteDocCode.trim() || undefined,
      letterheadQuoteDocVersion: form.letterheadQuoteDocVersion.trim() || undefined,
      letterheadQuoteDocDate: form.letterheadQuoteDocDate.trim() || undefined,
      letterheadCollectionDocCode: form.letterheadCollectionDocCode.trim() || undefined,
      letterheadCollectionDocVersion: form.letterheadCollectionDocVersion.trim() || undefined,
      letterheadCollectionDocDate: form.letterheadCollectionDocDate.trim() || undefined,
      letterheadFooterText: form.letterheadFooterText.trim() || undefined,
      letterheadShowFixtrackBranding: form.letterheadShowFixtrackBranding,
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxId">NIT</Label>
            <Input
              id="taxId"
              value={form.taxId}
              onChange={updateField("taxId")}
              placeholder="900.123.456-7"
            />
            <p className="text-xs text-muted-foreground">
              Aparece en el membrete de los documentos imprimibles (ej. cotizaciones).
            </p>
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
          <CardTitle>Membrete de empresa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Personaliza cómo se ven la orden de trabajo, la cotización y la
            cuenta de cobro — distinto del formato que exige un cliente
            puntual (Módulo de Formatos): si una orden se imprime con el
            formato de un cliente, ese manda; esto aplica a todo lo demás.
            Si no configuras nada acá, los documentos se ven exactamente
            como hoy.
          </p>

          <LetterheadPreview
            companyName={form.name}
            slogan={form.slogan}
            logoUrl={logoUrl}
            accentColorInput={form.letterheadAccentColor}
            footerText={form.letterheadFooterText}
            showFixtrackBranding={form.letterheadShowFixtrackBranding}
            website={form.website}
            email={form.email}
            phone={form.phone}
            controlBoxes={{
              workOrder: {
                code: form.letterheadWorkOrderDocCode,
                version: form.letterheadWorkOrderDocVersion,
                date: form.letterheadWorkOrderDocDate,
              },
              quote: {
                code: form.letterheadQuoteDocCode,
                version: form.letterheadQuoteDocVersion,
                date: form.letterheadQuoteDocDate,
              },
              collection: {
                code: form.letterheadCollectionDocCode,
                version: form.letterheadCollectionDocVersion,
                date: form.letterheadCollectionDocDate,
              },
            }}
          />

          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <Label htmlFor="letterheadAccentColor">Color de acento</Label>
            <div className="flex items-center gap-2">
              <input
                id="letterheadAccentColor"
                type="color"
                value={form.letterheadAccentColor || DEFAULT_ACCENT_COLOR}
                onChange={updateField("letterheadAccentColor")}
                className="h-9 w-14 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1"
              />
              <Input
                value={form.letterheadAccentColor}
                onChange={updateField("letterheadAccentColor")}
                placeholder="#2563EB"
                className="max-w-32"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Reemplaza el azul de FixTrack en títulos de sección, franjas,
              líneas divisorias y totales destacados. El texto sobre un
              fondo pintado con este color se ajusta solo (blanco o gris
              oscuro, el que mejor se lea) — puedes elegir cualquier color,
              incluso uno claro.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <p className="text-sm font-medium">Recuadro de control documental</p>
            <p className="-mt-2 text-xs text-muted-foreground">
              Código, versión y fecha de versión de cada documento, al
              estilo de los sistemas de calidad. Deja los 3 campos vacíos
              en un documento para que su recuadro no aparezca.
            </p>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Orden de trabajo</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  aria-label="Código de la orden de trabajo"
                  value={form.letterheadWorkOrderDocCode}
                  onChange={updateField("letterheadWorkOrderDocCode")}
                  placeholder="Código"
                />
                <Input
                  aria-label="Versión de la orden de trabajo"
                  value={form.letterheadWorkOrderDocVersion}
                  onChange={updateField("letterheadWorkOrderDocVersion")}
                  placeholder="Versión"
                />
                <Input
                  aria-label="Fecha de versión de la orden de trabajo"
                  value={form.letterheadWorkOrderDocDate}
                  onChange={updateField("letterheadWorkOrderDocDate")}
                  placeholder="Fecha (ej. 28/09/2019)"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Cotización</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  aria-label="Código de la cotización"
                  value={form.letterheadQuoteDocCode}
                  onChange={updateField("letterheadQuoteDocCode")}
                  placeholder="Código"
                />
                <Input
                  aria-label="Versión de la cotización"
                  value={form.letterheadQuoteDocVersion}
                  onChange={updateField("letterheadQuoteDocVersion")}
                  placeholder="Versión"
                />
                <Input
                  aria-label="Fecha de versión de la cotización"
                  value={form.letterheadQuoteDocDate}
                  onChange={updateField("letterheadQuoteDocDate")}
                  placeholder="Fecha (ej. 28/09/2019)"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">{form.collectionDocTitle || "Cuenta de cobro"}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  aria-label="Código de la cuenta de cobro"
                  value={form.letterheadCollectionDocCode}
                  onChange={updateField("letterheadCollectionDocCode")}
                  placeholder="Código"
                />
                <Input
                  aria-label="Versión de la cuenta de cobro"
                  value={form.letterheadCollectionDocVersion}
                  onChange={updateField("letterheadCollectionDocVersion")}
                  placeholder="Versión"
                />
                <Input
                  aria-label="Fecha de versión de la cuenta de cobro"
                  value={form.letterheadCollectionDocDate}
                  onChange={updateField("letterheadCollectionDocDate")}
                  placeholder="Fecha (ej. 28/09/2019)"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <Label htmlFor="letterheadFooterText">Pie de página</Label>
            <Input
              id="letterheadFooterText"
              value={form.letterheadFooterText}
              onChange={updateField("letterheadFooterText")}
              placeholder="Ej. Tel. 300 000 0000 · info@tuempresa.com · www.tuempresa.com"
            />
            <p className="text-xs text-muted-foreground">
              Reemplaza la línea de contacto automática (sitio, correo o
              teléfono) al pie de los 3 documentos. Vacío = esa línea de
              contacto, tal como hoy.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border p-3">
            <input
              id="letterheadShowFixtrackBranding"
              type="checkbox"
              className="mt-0.5"
              checked={form.letterheadShowFixtrackBranding}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  letterheadShowFixtrackBranding: event.target.checked,
                }))
              }
            />
            <Label htmlFor="letterheadShowFixtrackBranding" className="font-normal">
              Mostrar &quot;Documento generado por FixTrack Pro&quot; en el pie
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Firma digital</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signature">Imagen de la firma (PNG)</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                {isUploadingSignature ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : signatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- firma remota en Cloudinary, sin dominio fijo que declarar
                  <img
                    src={signatureUrl}
                    alt="Firma sobre fondo claro"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-center text-[10px] text-muted-foreground">
                    Sin firma
                  </span>
                )}
              </div>
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-neutral-900">
                {isUploadingSignature ? (
                  <Loader2 className="size-5 animate-spin text-neutral-400" />
                ) : signatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- firma remota en Cloudinary, sin dominio fijo que declarar
                  <img
                    src={signatureUrl}
                    alt="Firma sobre fondo oscuro"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-center text-[10px] text-neutral-400">
                    Sin firma
                  </span>
                )}
              </div>
              <input
                ref={signatureInputRef}
                id="signature"
                type="file"
                accept="image/png"
                onChange={(event) => void handleSignatureChange(event)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploadingSignature}
                onClick={() => signatureInputRef.current?.click()}
              >
                {isUploadingSignature
                  ? "Subiendo..."
                  : signatureUrl
                    ? "Cambiar firma"
                    : "Subir firma"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Debe ser PNG con fondo transparente. El recuadro oscuro sirve
              para detectar si la imagen en realidad trae fondo blanco: si
              ahí se ve un cuadro claro alrededor del trazo, exporta de
              nuevo la firma con transparencia real.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-sm font-medium">Dónde se estampa</p>
            <div className="flex items-start gap-2 rounded-lg border border-border p-3">
              <input
                id="signatureInCollection"
                type="checkbox"
                className="mt-0.5"
                checked={form.signatureInCollection}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    signatureInCollection: event.target.checked,
                  }))
                }
              />
              <Label htmlFor="signatureInCollection" className="font-normal">
                Cuenta de cobro
              </Label>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border p-3">
              <input
                id="signatureInQuote"
                type="checkbox"
                className="mt-0.5"
                checked={form.signatureInQuote}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    signatureInQuote: event.target.checked,
                  }))
                }
              />
              <Label htmlFor="signatureInQuote" className="font-normal">
                Cotización
              </Label>
            </div>
          </div>

          {signatureWontStamp ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <p>
                <strong>La firma NO se va a estampar en ningún documento todavía.</strong>{" "}
                Falta el nombre de quien firma — lo completas en la tarjeta
                &quot;Documento de cobro&quot;, campo &quot;Nombre del firmante&quot;,
                más abajo.
              </p>
            </div>
          ) : (
            <p className="text-xs font-medium text-amber-700">
              Con una firma cargada, todos los documentos que marques arriba
              saldrán firmados automáticamente, sin revisión manual antes de
              enviarlos o imprimirlos.
            </p>
          )}
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
                aria-invalid={signatureWontStamp}
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
          <p
            className={
              signatureWontStamp
                ? "text-xs font-medium text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {signatureWontStamp
              ? "Falta este nombre — la firma cargada en \"Firma digital\" NO se va a estampar en ningún documento hasta que lo completes."
              : "Si dejas el firmante vacío, el documento no muestra recuadro de firma."}
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultMethodology">Metodología / plan de trabajo</Label>
            <textarea
              id="defaultMethodology"
              value={form.defaultMethodology}
              onChange={updateField("defaultMethodology")}
              rows={3}
              placeholder="Texto que se prellena en cada cotización nueva — editable ahí mientras siga en borrador"
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
