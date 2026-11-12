const UPLOAD_MARKER = "/upload/";

/**
 * Tamaño a pedirle a Cloudinary para mostrar la foto, sin tocar la URL
 * almacenada (el original se conserva intacto en la base de datos).
 *
 *  - thumbnail: cuadrícula de la galería y portada del detalle (huecos de
 *    ~110–160 px).
 *  - listThumbnail: miniaturas de los LISTADOS (tarjeta móvil de 64 px,
 *    tabla de 40 px). 192 px cubren un hueco de 64 px a densidad 3× (los
 *    Android de los técnicos); servir 320 ahí era una imagen 5× más grande
 *    de lo que se ve, multiplicada por cada fila de la lista.
 *    q_auto:eco: 17–31 % menos por miniatura con fotos reales, sin diferencia
 *    visible a 64 px (comparado lado a lado a densidad 3×, 2026-11-12).
 *  - full: al abrir la foto en grande — mismas dimensiones que el original,
 *    solo negocia formato/calidad (webp/avif cuando el navegador lo soporta).
 *  - print: informe impreso — calidad suficiente para imprimir sin bajar el original.
 *  - signature: firma estampada en un documento — ancho fijo (~50mm impresos),
 *    q_auto:good conserva nitidez del trazo sin pedir el original completo.
 */
export type CloudinaryPreset =
  | "thumbnail"
  | "listThumbnail"
  | "full"
  | "print"
  | "signature";

const TRANSFORMS: Record<CloudinaryPreset, string> = {
  thumbnail: "c_fill,w_320,h_320,q_auto,f_auto",
  listThumbnail: "c_fill,w_192,h_192,q_auto:eco,f_auto",
  print: "c_limit,w_1000,q_auto:good,f_auto",
  full: "q_auto,f_auto",
  signature: "c_limit,w_600,q_auto:good,f_auto",
};

/**
 * Deriva una URL de entrega transformada a partir de la URL de Cloudinary
 * almacenada. Si la URL no es de Cloudinary (ej. dato legacy), la devuelve
 * sin cambios en vez de romperla.
 */
export function cloudinaryUrl(url: string, preset: CloudinaryPreset): string {
  const markerIndex = url.indexOf(UPLOAD_MARKER);
  if (markerIndex === -1 || !url.includes("res.cloudinary.com")) {
    return url;
  }

  const insertAt = markerIndex + UPLOAD_MARKER.length;
  return `${url.slice(0, insertAt)}${TRANSFORMS[preset]}/${url.slice(insertAt)}`;
}
