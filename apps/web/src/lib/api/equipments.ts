import { cache } from "react";
import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente el enum EquipmentStatus de packages/database/prisma/schema.prisma
export type EquipmentStatus = "ACTIVE" | "IN_REPAIR" | "RETIRED";

export interface EquipmentClient {
  id: string;
  name: string;
}

// Debe reflejar exactamente el shape de CLIENT_SUMMARY(_WITH_COUNT) en
// packages/backend/src/equipments/equipments.service.ts
export interface Equipment {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  /** Ubicación física del equipo en la sede del cliente (multi-sede). */
  location: string | null;
  qrCode: string;
  status: EquipmentStatus;
  /** Plan de mantenimiento preventivo — la alerta es POR EQUIPO. */
  maintenanceEnabled: boolean;
  maintenanceIntervalMonths: number | null;
  /** Fechas @db.Date — ISO con medianoche UTC. Usar SIEMPRE
   * lib/format/date-only.ts para leerlas, nunca formatDate() de ./dates. */
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  clientId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  client: EquipmentClient;
  /** Solo presente en la respuesta de getEquipments() (findAll). */
  orderCount?: number;
}

export interface CreateEquipmentInput {
  brand: string;
  model: string;
  serialNumber?: string;
  location?: string;
  clientId: string;
  status?: EquipmentStatus;
}

export interface UpdateEquipmentInput {
  brand?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  clientId?: string;
  status?: EquipmentStatus;
  /** Solo ADMIN/COORDINATOR (403 para el resto — ver RBAC en el backend). */
  maintenanceEnabled?: boolean;
  maintenanceIntervalMonths?: number;
  /** "YYYY-MM-DD", sin hora. No puede ser futura. */
  lastMaintenanceAt?: string;
}

export interface EquipmentFilters {
  clientId?: string;
}

// Debe reflejar exactamente MaintenanceDueItem en
// packages/backend/src/equipments/equipments.service.ts
export interface MaintenanceDueItem {
  id: string;
  brand: string;
  model: string;
  location: string | null;
  client: EquipmentClient;
  nextMaintenanceAt: string;
  /** Negativo = vencido hace N días. */
  daysRemaining: number;
  maintenanceIntervalMonths: number;
}

export interface ActivateMaintenanceBatchInput {
  clientId: string;
  equipmentIds: string[];
  maintenanceIntervalMonths: number;
  lastMaintenanceAt: string;
}

/** GET /equipments[?clientId=]. Devuelve orderCount agregado por el backend. */
export function getEquipments(filters: EquipmentFilters = {}): Promise<Equipment[]> {
  const query = filters.clientId ? `?clientId=${filters.clientId}` : "";
  return serverFetch<Equipment[]>(`/equipments${query}`);
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

/**
 * PATCH /equipments/:id. Cualquier rol autenticado puede editar campos
 * generales; el plan de mantenimiento (maintenanceEnabled/IntervalMonths/
 * lastMaintenanceAt) es SOLO ADMIN/COORDINATOR — 403 para TECHNICIAN.
 */
export function updateEquipment(
  id: string,
  dto: UpdateEquipmentInput,
): Promise<Equipment> {
  return serverFetch<Equipment>(`/equipments/${id}`, {
    method: "PATCH",
    body: dto,
  });
}

/**
 * GET /equipments/maintenance-due[?all=true]. Solo ADMIN/COORDINATOR.
 * Equipos con plan activo, del más vencido al menos urgente (mismo orden
 * que devuelve el backend). Por defecto, solo por vencer (30 días) o ya
 * vencidos; `all: true` trae TODOS los equipos con plan activo sin importar
 * cuándo vencen (vista "Todos los planes" de /mantenimiento).
 */
export function getMaintenanceDue(options: { all?: boolean } = {}): Promise<MaintenanceDueItem[]> {
  const query = options.all ? "?all=true" : "";
  return serverFetch<MaintenanceDueItem[]>(`/equipments/maintenance-due${query}`);
}

/**
 * POST /equipments/maintenance/activate-batch. Solo ADMIN/COORDINATOR.
 * Activa el plan de varios equipos de UN cliente con el mismo intervalo y
 * fecha base, en una sola operación transaccional.
 */
export function activateMaintenanceBatch(
  dto: ActivateMaintenanceBatchInput,
): Promise<{ updated: number }> {
  return serverFetch<{ updated: number }>("/equipments/maintenance/activate-batch", {
    method: "POST",
    body: dto,
  });
}
