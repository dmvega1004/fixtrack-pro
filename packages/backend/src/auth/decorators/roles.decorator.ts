import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { Role } from 'database';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a los roles indicados (RBAC).
 * Ejemplo: @Roles(Role.ADMIN, Role.COORDINATOR)
 * El enum Role proviene de Prisma: única fuente de verdad.
 */
export const Roles = (...roles: Role[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
