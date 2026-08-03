const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El qrCode de Equipment es un UUID plano (@default(uuid()) en Prisma), no
 * una URL. Se usa para descartar lecturas de códigos QR ajenos a FixTrack
 * antes de golpear el backend.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}
