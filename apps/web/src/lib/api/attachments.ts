import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente el modelo Attachment de
// packages/database/prisma/schema.prisma
export interface Attachment {
  id: string;
  url: string;
  publicId: string;
  workOrderId: string;
  companyId: string;
  uploadedById: string | null;
  createdAt: string;
}

/** GET /work-orders/:orderId/photos. Mismas reglas de visibilidad que la orden. */
export function getPhotos(orderId: string): Promise<Attachment[]> {
  return serverFetch<Attachment[]>(`/work-orders/${orderId}/photos`);
}
