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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;

    setIsSaving(true);
    const result = await saveCompanyAction({
      name: form.name.trim(),
      slogan: form.slogan.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      website: form.website.trim() || undefined,
      currency: form.currency,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudieron guardar los datos");
      return;
    }

    toast.success("Datos de la empresa actualizados");
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

      <Button
        type="submit"
        disabled={isSaving || !form.name.trim()}
        className="w-full md:w-auto md:self-end"
      >
        {isSaving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
