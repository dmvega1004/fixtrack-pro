/**
 * Tamaño de página de /ordenes ("Cargar más"). GET /work-orders no tiene
 * límite por defecto (compatibilidad con el resto de consumidores que
 * esperan la lista completa), así que el límite lo decide esta pantalla.
 * En archivo aparte (no en actions.ts) porque un módulo "use server" solo
 * puede exportar funciones async.
 */
export const ORDERS_PAGE_SIZE = 30;
