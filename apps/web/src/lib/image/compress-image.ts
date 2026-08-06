const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

/**
 * Redimensiona el lado mayor a MAX_DIMENSION y reexporta a JPEG en el
 * navegador antes de subir. Las fotos de cámara suelen pesar varios MB y
 * superan el límite de body de las funciones serverless de Vercel (~4.5MB);
 * comprimir acá también acelera la subida en redes móviles lentas, crítico
 * en campo.
 *
 * Si el navegador no puede decodificar el archivo (ej. algunos HEIC en
 * Chrome/Android) o la compresión no reduce el tamaño, devuelve el archivo
 * original tal cual — nunca bloquea la subida por esto.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const jpegName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], jpegName, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
