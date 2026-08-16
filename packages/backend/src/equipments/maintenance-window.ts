/**
 * Ventana de "por vencer" del panel de mantenimiento preventivo: un equipo
 * con plan activo entra a GET /equipments/maintenance-due (y a su conteo en
 * el dashboard) cuando su nextMaintenanceAt cae dentro de los próximos
 * MAINTENANCE_DUE_WINDOW_DAYS días, o ya pasó. Constante única para que el
 * listado y el conteo del dashboard nunca puedan desincronizarse.
 */
export const MAINTENANCE_DUE_WINDOW_DAYS = 30;
