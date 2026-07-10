import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ClientsModule } from './clients/clients.module';
import { EquipmentsModule } from './equipments/equipments.module';
import { PrismaModule } from './prisma.module';
import { SparePartsModule } from './spare-parts/spare-parts.module';
import { UsersModule } from './users/users.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClientsModule,
    EquipmentsModule,
    WorkOrdersModule,
    SparePartsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guards GLOBALES: el orden importa — primero autentica (JWT),
    // luego autoriza (RBAC). Todo endpoint queda protegido por defecto.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
