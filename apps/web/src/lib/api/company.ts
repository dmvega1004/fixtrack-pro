import { serverFetch } from "./server-fetch";
import type { Currency } from "@/lib/currency";
import type { SectionTitleStyle } from "@/lib/work-order-header-fields";
import type { WorkOrderSection } from "@/lib/work-order-sections";

export type { Currency } from "@/lib/currency";

// Debe reflejar exactamente COMPANY_SELECT en
// packages/backend/src/company/company.service.ts
export interface Company {
  id: string;
  name: string;
  slogan: string | null;
  /** NIT (u otro documento tributario) de la empresa — para el membrete de documentos imprimibles. */
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  logoUrl: string | null;
  /** URL de la imagen de la firma digital (Cloudinary, PNG). */
  signatureImageUrl: string | null;
  /** Documentos en los que se estampa la firma automáticamente. */
  signatureInCollection: boolean;
  signatureInQuote: boolean;
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
  defaultMethodology: string | null;
  defaultValidityDays: number;
  quoteFollowUpDays: number;
  quoteFootnote: string | null;
  /** Membrete de empresa (panel "Mi empresa") — distinto eje de
   * Client.reportFormat* (formato que exige un CLIENTE). Color hexadecimal;
   * null = azul de FixTrack, igual que hoy. */
  letterheadAccentColor: string | null;
  /** Recuadro de control documental, uno por tipo de documento. Vacíos los
   * 3 de un tipo = ese recuadro no se muestra. */
  letterheadWorkOrderDocCode: string | null;
  letterheadWorkOrderDocVersion: string | null;
  letterheadWorkOrderDocDate: string | null;
  letterheadQuoteDocCode: string | null;
  letterheadQuoteDocVersion: string | null;
  letterheadQuoteDocDate: string | null;
  letterheadCollectionDocCode: string | null;
  letterheadCollectionDocVersion: string | null;
  letterheadCollectionDocDate: string | null;
  /** Pie de página propio, único para los 3 documentos. Null = línea de contacto automática de siempre. */
  letterheadFooterText: string | null;
  /** "Documento generado por FixTrack Pro" al pie. Default true = comportamiento de hoy. */
  letterheadShowFixtrackBranding: boolean;
  /** Estilo de los títulos de sección en los 3 documentos. Default "UNDERLINE" = el de hoy. */
  letterheadSectionTitleStyle: SectionTitleStyle;
  /** Campos opcionales del encabezado de la orden de trabajo, EN EL ORDEN en que se pintan. [] = sin configurar. */
  letterheadWorkOrderHeaderFields: string[];
  /** Secciones de contenido configurables de la orden de trabajo, EN EL ORDEN en que se pintan. [] = sin configurar (bloque original de siempre). */
  letterheadWorkOrderSections: WorkOrderSection[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompanyInput {
  name?: string;
  slogan?: string;
  taxId?: string;
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
  signatureInCollection?: boolean;
  signatureInQuote?: boolean;
  nextCollectionNumber?: number;
  nextQuoteNumber?: number;
  defaultPaymentTerms?: string;
  defaultDeliveryTime?: string;
  defaultWarrantyTerms?: string;
  defaultExclusions?: string;
  defaultMethodology?: string;
  defaultValidityDays?: number;
  quoteFollowUpDays?: number;
  quoteFootnote?: string;
  letterheadAccentColor?: string;
  letterheadWorkOrderDocCode?: string;
  letterheadWorkOrderDocVersion?: string;
  letterheadWorkOrderDocDate?: string;
  letterheadQuoteDocCode?: string;
  letterheadQuoteDocVersion?: string;
  letterheadQuoteDocDate?: string;
  letterheadCollectionDocCode?: string;
  letterheadCollectionDocVersion?: string;
  letterheadCollectionDocDate?: string;
  letterheadFooterText?: string;
  letterheadShowFixtrackBranding?: boolean;
  letterheadSectionTitleStyle?: SectionTitleStyle;
  letterheadWorkOrderHeaderFields?: string[];
  letterheadWorkOrderSections?: WorkOrderSection[];
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
