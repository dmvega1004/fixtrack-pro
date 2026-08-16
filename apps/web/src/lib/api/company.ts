import { serverFetch } from "./server-fetch";
import type { Currency } from "@/lib/currency";

export type { Currency } from "@/lib/currency";

// Debe reflejar exactamente COMPANY_SELECT en
// packages/backend/src/company/company.service.ts
export interface Company {
  id: string;
  name: string;
  slogan: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  logoUrl: string | null;
  currency: string;
  /** Porcentaje de IVA del tenant (ej. "19.00"). "0.00" si no es responsable de IVA. */
  taxRate: string;
  /** Título configurable del documento de cobro (ej. "Cuenta de cobro"). */
  collectionDocTitle: string;
  /** Beneficiario del pago si difiere del nombre de la empresa. */
  payeeName: string | null;
  payeeDocument: string | null;
  bankName: string | null;
  bankAccount: string | null;
  signerName: string | null;
  signerRole: string | null;
  collectionDocFootnote: string | null;
  /** Próximo consecutivo a asignar — solo aplica a documentos futuros. */
  nextCollectionNumber: number;
  /** Próximo consecutivo de cotización — solo aplica a la próxima que se ENVÍE. */
  nextQuoteNumber: number;
  defaultPaymentTerms: string | null;
  defaultDeliveryTime: string | null;
  defaultWarrantyTerms: string | null;
  defaultExclusions: string | null;
  defaultValidityDays: number;
  quoteFollowUpDays: number;
  quoteFootnote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompanyInput {
  name?: string;
  slogan?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  currency?: Currency;
  taxRate?: number;
  collectionDocTitle?: string;
  payeeName?: string;
  payeeDocument?: string;
  bankName?: string;
  bankAccount?: string;
  signerName?: string;
  signerRole?: string;
  collectionDocFootnote?: string;
  nextCollectionNumber?: number;
  nextQuoteNumber?: number;
  defaultPaymentTerms?: string;
  defaultDeliveryTime?: string;
  defaultWarrantyTerms?: string;
  defaultExclusions?: string;
  defaultValidityDays?: number;
  quoteFollowUpDays?: number;
  quoteFootnote?: string;
}

export interface UpdateCompanyResult extends Company {
  /** Presente si nextCollectionNumber quedó en o por debajo de un número ya emitido. */
  collectionNumberWarning?: string;
}

/** GET /company/me. Los 3 roles ven los datos del tenant de su sesión. */
export function getCompany(): Promise<Company> {
  return serverFetch<Company>("/company/me");
}

/** PATCH /company/me. Solo ADMIN (403 para el resto). */
export function updateCompany(dto: UpdateCompanyInput): Promise<UpdateCompanyResult> {
  return serverFetch<UpdateCompanyResult>("/company/me", { method: "PATCH", body: dto });
}
