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
}

/** GET /company/me. Los 3 roles ven los datos del tenant de su sesión. */
export function getCompany(): Promise<Company> {
  return serverFetch<Company>("/company/me");
}

/** PATCH /company/me. Solo ADMIN (403 para el resto). */
export function updateCompany(dto: UpdateCompanyInput): Promise<Company> {
  return serverFetch<Company>("/company/me", { method: "PATCH", body: dto });
}
