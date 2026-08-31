"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-type";
import type { Client } from "@/lib/api/clients";
import type { Retention } from "@/lib/api/retentions";
import {
  REPORT_FORMAT_SOURCES,
  REPORT_FORMAT_SOURCE_LABELS,
  type ReportFormatSource,
} from "@/lib/report-format";
import { createClientAction, updateClientAction } from "@/app/(dashboard)/clientes/actions";

const DEFAULT_ACCENT_COLOR = "#2563EB";

interface UploadErrorBody {
  message?: string;
}

interface ReportFormatFormState {
  enabled: boolean;
  title: string;
  code: string;
  version: string;
  date: string;
  accentColor: string;
  footer: string;
  issuer: string;
  s1Label: string;
  s1Source: ReportFormatSource;
  s2Label: string;
  s2Source: ReportFormatSource;
  s3Label: string;
  s3Source: ReportFormatSource;
  includePhotos: boolean;
  photosLabel: string;
}

function toReportFormatState(client?: Client): ReportFormatFormState {
  return {
    enabled: client?.reportFormatEnabled ?? false,
    title: client?.reportFormatTitle ?? "",
    code: client?.reportFormatCode ?? "",
    version: client?.reportFormatVersion ?? "",
    date: client?.reportFormatDate ?? "",
    accentColor: client?.reportFormatAccentColor ?? DEFAULT_ACCENT_COLOR,
    footer: client?.reportFormatFooter ?? "",
    issuer: client?.reportFormatIssuer ?? "",
    s1Label: client?.reportFormatS1Label ?? "",
    s1Source: client?.reportFormatS1Source ?? "DESCRIPTION",
    s2Label: client?.reportFormatS2Label ?? "",
    s2Source: client?.reportFormatS2Source ?? "DIAGNOSIS",
    s3Label: client?.reportFormatS3Label ?? "",
    s3Source: client?.reportFormatS3Source ?? "OBSERVATIONS",
    includePhotos: client?.reportFormatIncludePhotos ?? true,
    photosLabel: client?.reportFormatPhotosLabel ?? "",
  };
}

interface ClientFormProps {
  mode: "create" | "edit";
  clientId?: string;
  initial?: Client;
  /**
   * ADMIN/COORDINATOR: los únicos roles que pueden configurar el formato de
   * informe propio (RBAC replicado del backend — ver ClientsService.
   * ensureCanConfigureReportFormat). Por defecto false: la página de "Nuevo
   * cliente" no la pasa porque la sección solo aplica en edición (el logo
   * necesita un clientId existente).
   */
  canConfigureReportFormat?: boolean;
  /**
   * ADMIN: único rol que puede configurar qué retenciones aplica el
   * cliente (RBAC replicado del backend — ver
   * ClientsService.ensureCanConfigureRetentions). Por defecto false.
   */
  canConfigureRetentions?: boolean;
  /** Catálogo de retenciones de la empresa — solo se pide si canConfigureRetentions. */
  retentionCatalog?: Retention[];
}

export function ClientForm({
  mode,
  clientId,
  initial,
  canConfigureReportFormat = false,
  canConfigureRetentions = false,
  retentionCatalog = [],
}: ClientFormProps) {
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
  const [city, setCity] = useState(initial?.city ?? "");
  const [paymentTermDays, setPaymentTermDays] = useState(
    String(initial?.paymentTermDays ?? 30),
  );
  const [isSaving, setIsSaving] = useState(false);

  const showReportFormat = mode === "edit" && canConfigureReportFormat;
  const [reportFormat, setReportFormat] = useState<ReportFormatFormState>(() =>
    toReportFormatState(initial),
  );
  const [logoUrl, setLogoUrl] = useState(initial?.reportFormatLogoUrl ?? null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [retentionIds, setRetentionIds] = useState<string[]>(
    initial?.retentionIds ?? [],
  );
  function toggleRetention(id: string) {
    setRetentionIds((current) =>
      current.includes(id) ? current.filter((r) => r !== id) : [...current, id],
    );
  }
  // Una retención desactivada no se ofrece para marcarla de nuevo, pero si
  // este cliente YA la tenía marcada (se desactivó después), sigue
  // apareciendo — mismo criterio que el bloque de retenciones de la orden.
  const availableRetentions = retentionCatalog.filter(
    (r) => r.active || retentionIds.includes(r.id),
  );

  function updateReportFormat<K extends keyof ReportFormatFormState>(
    field: K,
  ) {
    return (
      event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
      setReportFormat((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !clientId) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/upload/report-format-logo/${clientId}`,
        { method: "POST", body: formData },
      );
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data as UploadErrorBody | null)?.message;
        toast.error(message ?? "No se pudo subir el logo");
        return;
      }

      setLogoUrl((data as Client).reportFormatLogoUrl);
      toast.success("Logo actualizado");
      router.refresh();
    } catch {
      toast.error("No se pudo subir el logo");
    } finally {
      setIsUploadingLogo(false);
    }
  }

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

  const paymentTermDaysValue = Number(paymentTermDays);
  const isPaymentTermDaysValid =
    paymentTermDays.trim() !== "" &&
    Number.isInteger(paymentTermDaysValue) &&
    paymentTermDaysValue >= 0;

  // Mismo criterio que el backend: el título solo es obligatorio si el
  // formato está activo — lo demás (código, versión, color, secciones...) es opcional.
  const isReportFormatValid =
    !showReportFormat || !reportFormat.enabled || reportFormat.title.trim() !== "";

  const isValid =
    name.trim() !== "" &&
    (!documentTypeRequired || documentType !== "") &&
    (!documentNumberRequired || documentNumber.trim() !== "") &&
    (!phoneRequired || phone.trim() !== "") &&
    isPaymentTermDaysValid &&
    isReportFormatValid &&
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
      city: city.trim() || undefined,
      paymentTermDays: paymentTermDaysValue,
      ...(showReportFormat && {
        reportFormatEnabled: reportFormat.enabled,
        reportFormatTitle: reportFormat.title.trim() || undefined,
        reportFormatCode: reportFormat.code.trim() || undefined,
        reportFormatVersion: reportFormat.version.trim() || undefined,
        reportFormatDate: reportFormat.date.trim() || undefined,
        reportFormatAccentColor: reportFormat.accentColor || undefined,
        reportFormatFooter: reportFormat.footer.trim() || undefined,
        reportFormatIssuer: reportFormat.issuer.trim() || undefined,
        reportFormatS1Label: reportFormat.s1Label.trim() || undefined,
        reportFormatS1Source: reportFormat.s1Source,
        reportFormatS2Label: reportFormat.s2Label.trim() || undefined,
        reportFormatS2Source: reportFormat.s2Source,
        reportFormatS3Label: reportFormat.s3Label.trim() || undefined,
        reportFormatS3Source: reportFormat.s3Source,
        reportFormatIncludePhotos: reportFormat.includePhotos,
        reportFormatPhotosLabel: reportFormat.photosLabel.trim() || undefined,
      }),
      ...(canConfigureRetentions && { retentionIds }),
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={address}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setAddress(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={city}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCity(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentTermDays">Días de crédito</Label>
            <Input
              id="paymentTermDays"
              type="number"
              min={0}
              step="1"
              value={paymentTermDays}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPaymentTermDays(event.target.value)
              }
              className="max-w-40"
            />
          </div>
        </CardContent>
      </Card>

      {showReportFormat && (
        <Card>
          <CardHeader>
            <CardTitle>Formato de informe propio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Actívalo cuando este cliente exige que las órdenes se entreguen
              en SU formato corporativo (típico al trabajar como
              subcontratista) — se genera un documento aparte, el informe
              propio de tu empresa sigue existiendo sin cambios.
            </p>

            <div className="flex items-start gap-2 rounded-lg border border-border p-3">
              <input
                id="reportFormatEnabled"
                type="checkbox"
                className="mt-0.5"
                checked={reportFormat.enabled}
                onChange={(event) =>
                  setReportFormat((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="reportFormatEnabled" className="font-normal">
                  Activar formato de informe propio para este cliente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Habilita el botón &quot;Imprimir formato del cliente&quot;
                  en las órdenes de este cliente.
                </p>
              </div>
            </div>

            {reportFormat.enabled && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reportFormatLogo">Logo del cliente</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {isUploadingLogo ? (
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      ) : logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- logo remoto en Cloudinary, sin dominio fijo que declarar
                        <img
                          src={logoUrl}
                          alt={reportFormat.title || "Logo del cliente"}
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
                      id="reportFormatLogo"
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
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reportFormatTitle">
                    Título del documento *
                  </Label>
                  <Input
                    id="reportFormatTitle"
                    value={reportFormat.title}
                    onChange={updateReportFormat("title")}
                    placeholder="Ej. ORDEN DE SERVICIO"
                    required={reportFormat.enabled}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reportFormatCode">Código</Label>
                    <Input
                      id="reportFormatCode"
                      value={reportFormat.code}
                      onChange={updateReportFormat("code")}
                      placeholder="Ej. FE-GPS-004"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reportFormatVersion">Versión</Label>
                    <Input
                      id="reportFormatVersion"
                      value={reportFormat.version}
                      onChange={updateReportFormat("version")}
                      placeholder="Ej. 2"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reportFormatDate">Fecha del formato</Label>
                    <Input
                      id="reportFormatDate"
                      value={reportFormat.date}
                      onChange={updateReportFormat("date")}
                      placeholder="Ej. 28/09/2019"
                    />
                  </div>
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">
                  Código, versión y fecha identifican la versión del formato
                  impreso — no son datos de la orden.
                </p>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reportFormatAccentColor">
                    Color de acento
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="reportFormatAccentColor"
                      type="color"
                      value={reportFormat.accentColor || DEFAULT_ACCENT_COLOR}
                      onChange={updateReportFormat("accentColor")}
                      className="h-9 w-14 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1"
                    />
                    <Input
                      value={reportFormat.accentColor}
                      onChange={updateReportFormat("accentColor")}
                      placeholder="#2563EB"
                      className="max-w-32"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se aplica a las franjas de sección del documento y al pie
                    de página.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reportFormatIssuer">
                    Empresa que entrega
                  </Label>
                  <Input
                    id="reportFormatIssuer"
                    value={reportFormat.issuer}
                    onChange={updateReportFormat("issuer")}
                    placeholder="Nombre de tu empresa tal como debe aparecer en el bloque de firmas"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reportFormatFooter">Pie de página</Label>
                  <Input
                    id="reportFormatFooter"
                    value={reportFormat.footer}
                    onChange={updateReportFormat("footer")}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-3">
                  <p className="text-sm font-medium">Secciones del documento</p>
                  <p className="-mt-2 text-xs text-muted-foreground">
                    Cada sección trae el contenido del campo de la orden que
                    elijas como origen. &quot;En blanco&quot; deja espacio
                    para escribir a mano.
                  </p>

                  {(["s1", "s2", "s3"] as const).map((section, index) => (
                    <div
                      key={section}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`${section}Label`}>
                          Etiqueta de la sección {index + 1}
                        </Label>
                        <Input
                          id={`${section}Label`}
                          value={reportFormat[`${section}Label`]}
                          onChange={updateReportFormat(`${section}Label`)}
                          placeholder="Ej. Descripción del trabajo realizado"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`${section}Source`}>
                          Se alimenta de
                        </Label>
                        <select
                          id={`${section}Source`}
                          value={reportFormat[`${section}Source`]}
                          onChange={updateReportFormat(`${section}Source`)}
                          className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
                        >
                          {REPORT_FORMAT_SOURCES.map((source) => (
                            <option key={source} value={source}>
                              {REPORT_FORMAT_SOURCE_LABELS[source]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-3">
                  <p className="text-sm font-medium">Registro fotográfico</p>
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <input
                      id="reportFormatIncludePhotos"
                      type="checkbox"
                      className="mt-0.5"
                      checked={reportFormat.includePhotos}
                      onChange={(event) =>
                        setReportFormat((current) => ({
                          ...current,
                          includePhotos: event.target.checked,
                        }))
                      }
                    />
                    <div className="flex flex-col gap-1">
                      <Label
                        htmlFor="reportFormatIncludePhotos"
                        className="font-normal"
                      >
                        Incluir el registro fotográfico
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        No todos los formatos corporativos admiten fotos —
                        desactívalo si el de este cliente no las lleva.
                      </p>
                    </div>
                  </div>

                  {reportFormat.includePhotos && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="reportFormatPhotosLabel">
                        Etiqueta de la franja
                      </Label>
                      <Input
                        id="reportFormatPhotosLabel"
                        value={reportFormat.photosLabel}
                        onChange={updateReportFormat("photosLabel")}
                        placeholder="Registro fotográfico"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {canConfigureRetentions && (
        <Card>
          <CardHeader>
            <CardTitle>Retenciones que aplica</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Lo que marques acá viene premarcado en las órdenes nuevas de
              este cliente — evita marcar las mismas casillas en cada orden
              de un cliente que siempre aplica las mismas. Sigue siendo
              editable en cada orden.
            </p>

            {availableRetentions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Todavía no has configurado ninguna retención en{" "}
                <span className="font-medium">Mi empresa</span>.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {availableRetentions.map((retention) => (
                  <div
                    key={retention.id}
                    className="flex items-start gap-2 rounded-lg border border-border p-3"
                  >
                    <input
                      id={`retention-${retention.id}`}
                      type="checkbox"
                      className="mt-0.5"
                      checked={retentionIds.includes(retention.id)}
                      onChange={() => toggleRetention(retention.id)}
                    />
                    <Label
                      htmlFor={`retention-${retention.id}`}
                      className="flex-1 font-normal"
                    >
                      {retention.name}{" "}
                      <span className="text-muted-foreground">
                        ({Number(retention.rate)}%)
                        {!retention.active && " · desactivada"}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button type="submit" disabled={!isValid} className="w-full md:w-auto md:self-end">
        {isSaving ? "Guardando..." : mode === "create" ? "Crear cliente" : "Guardar cambios"}
      </Button>
    </form>
  );
}
