import { Role } from 'database';

/**
 * Contenido firmado dentro del token JWT.
 * `sub` es el estándar JWT para el identificador del sujeto (userId).
 * `name` viaja solo para que el frontend lo muestre sin una llamada extra
 * (GET /users/:id es ADMIN/COORDINATOR-only, así que el Técnico no podría
 * resolverlo de otra forma). No se usa para autorización — igual que
 * `email`, puede quedar desactualizado hasta el siguiente login si un
 * ADMIN edita el nombre.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
}

/**
 * Usuario autenticado que viaja en `request.user` tras validar el token.
 * Incluye el companyId: el candado Multi-Tenant que TODA consulta debe usar.
 * `name` se lee fresco de la BD en cada request (ver JwtStrategy.validate) —
 * a diferencia del `name` del JwtPayload, nunca queda desactualizado.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
}
