import type { AnchorHTMLAttributes } from "react";

/**
 * Único enlace permitido dentro de esta carpeta — ver el override de
 * eslint.config.mjs, que PROHÍBE importar next/link y next/navigation acá
 * y no en ningún otro lado. No es una preferencia de estilo: se probó
 * (Etapa 2-D) que un next/link o un router.push disparado desde esta
 * pantalla NO navega — ni cambia la URL, ni registra nada, simplemente no
 * hace nada — cuando esta pantalla se sirvió en la MISMA dirección de una
 * orden real (/ordenes/<id>) sin ser esa ruta en el árbol de Next: el
 * enrutador de cliente queda con un estado inconsistente y no logra
 * reconciliar una navegación posterior.
 *
 * Un <a href> plano no tiene ese problema: siempre dispara una navegación
 * real de documento, que es justo lo que el service worker sabe
 * interceptar (ver apps/web/public/sw.js). Es un componente y no solo la
 * costumbre de escribir <a> a mano para que el resto de la carpeta tenga
 * una sola forma de enlazar, fácil de reconocer en una revisión.
 */
export function OfflineSafeLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
