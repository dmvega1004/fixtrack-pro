import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { MustChangePasswordGuard } from './auth/guards/must-change-password.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { BillingModule } from './billing/billing.module';
import { ClientsModule } from './clients/clients.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CompanyModule } from './company/company.module';
import { EquipmentsModule } from './equipments/equipments.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma.module';
import { ProfitabilityModule } from './profitability/profitability.module';
import { QuotesModule } from './quotes/quotes.module';
import { SparePartsModule } from './spare-parts/spare-parts.module';
import { UsersModule } from './users/users.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [
    // Registrado a nivel de app para que ThrottlerGuard esté disponible,
    // pero NO se aplica como guard global: solo se usa explícitamente en
    // AuthController.login para no arriesgar 429 en el resto de la API.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 20 }]),
    PrismaModule,
    AuthModule,
    AttachmentsModule,
    BillingModule,
    ClientsModule,
    CloudinaryModule,
    CompanyModule,
    EquipmentsModule,
    PaymentsModule,
    ProfitabilityModule,
    QuotesModule,
    WorkOrdersModule,
    SparePartsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guards GLOBALES: el orden importa — primero autentica (JWT), luego
    // bloquea a quien deba cambiar su contraseña (antes de cualquier
    // chequeo de rol: ese estado es más fundamental que el RBAC), luego
    // autoriza (RBAC). Todo endpoint queda protegido por defecto.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangePasswordGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
