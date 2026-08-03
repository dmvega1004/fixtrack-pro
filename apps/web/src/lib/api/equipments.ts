import { cache } from "react";
import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente el enum EquipmentStatus de packages/database/prisma/schema.prisma
export type EquipmentStatus = "ACTIVE" | "IN_REPAIR" | "RETIRED";

export interface EquipmentClient {
  id: string;
  name: string;
}

// Debe reflejar exactamente el shape de CLIENT_SUMMARY en
// packages/backend/src/equipments/equipments.service.ts
export interface Equipment {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  qrCode: string;
  status: EquipmentStatus;
  clientId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  client: EquipmentClient;
}

export interface CreateEquipmentInput {
  brand: string;
  model: string;
  serialNumber?: string;
  clientId: string;
  status?: EquipmentStatus;
}

export interface UpdateEquipmentInput {
  brand?: string;
  model?: string;
  serialNumber?: string;
  clientId?: string;
  status?: EquipmentStatus;
}

/**
 * GET /equipments. El backend no soporta filtrar por cliente en query —
 * devuelve todos los equipos de la empresa (con el cliente incluido) y el
 * filtrado por cliente se hace del lado de Next sobre esta lista.
 */
export function getEquipments(): Promise<Equipment[]> {
  return serverFetch<Equipment[]>("/equipments");
}

/**
 * GET /equipments/:id. 404 si el equipo es de otra empresa.
 * cache() de React: dedupe si en el mismo render se pide el mismo id desde
 * varios lugares (ej. generateMetadata + la página de etiqueta).
 */
export const getEquipment = cache((id: string): Promise<Equipment> => {
  return serverFetch<Equipment>(`/equipments/${id}`);
});

/**
 * GET /equipments/qr/:qrCode. Usado por el escáner de /escanear. El backend
 * valida que qrCode tenga forma de UUID (400 si no) y aplica el candado de
 * companyId (404 si es de otra empresa o no existe).
 */
export function getEquipmentByQrCode(qrCode: string): Promise<Equipment> {
  return serverFetch<Equipment>(`/equipments/qr/${qrCode}`);
}

/** POST /equipments. Cualquier rol autenticado puede crear (los técnicos registran en campo). */
export function createEquipment(dto: CreateEquipmentInput): Promise<Equipment> {
  return serverFetch<Equipment>("/equipments", { method: "POST", body: dto });
}

/** PATCH /equipments/:id. Cualquier rol autenticado puede editar (incluido el estado). */
export function updateEquipment(
  id: string,
  dto: UpdateEquipmentInput,
): Promise<Equipment> {
  return serverFetch<Equipment>(`/equipments/${id}`, {
    method: "PATCH",
    body: dto,
  });
}
