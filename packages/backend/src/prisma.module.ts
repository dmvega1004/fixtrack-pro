import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Módulo global de acceso a datos: cualquier módulo del backend
 * (Auth, Clients, WorkOrders...) puede inyectar PrismaService
 * sin re-importarlo, garantizando UNA sola conexión al pool.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
