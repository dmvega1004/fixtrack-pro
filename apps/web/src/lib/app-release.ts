/**
 * Fuente de verdad de la página pública de descarga (/app). Al publicar
 * una versión nueva del APK: sube el archivo sobreescribiendo
 * apps/web/public/app/fixtrackpro.apk y actualiza version/releaseDate
 * acá. Ver "Publicar una versión nueva" en apps/mobile/README.md.
 */
export const APP_RELEASE = {
  version: "1.0.0",
  /** YYYY-MM-DD, mismo formato que consume formatDateOnly. */
  releaseDate: "2026-09-01",
  fileName: "fixtrackpro.apk",
} as const;

export const APP_DOWNLOAD_PATH = `/app/${APP_RELEASE.fileName}`;
