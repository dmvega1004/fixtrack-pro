import { Role } from 'database';

/**
 * Contenido firmado dentro del token JWT.
 * `sub` es el estándar JWT para el identificador del sujeto (userId).
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  companyId: string;
}

/**
 * Usuario autenticado que viaja en `request.user` tras validar el token.
 * Incluye el companyId: el candado Multi-Tenant que TODA consulta debe usar.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
  companyId: string;
}
