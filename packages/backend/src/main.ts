import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Headers de seguridad estándar (HSTS, X-Content-Type-Options, etc.).
  // Esta es una API JSON pura, no sirve HTML: la CSP por defecto de helmet
  // no tiene efecto práctico aquí, pero el resto de headers sí endurecen
  // la respuesta ante quien golpee el backend directamente.
  app.use(helmet());

  // Validación global de DTOs:
  // - whitelist: descarta propiedades no declaradas en el DTO
  // - forbidNonWhitelisted: rechaza el request si trae propiedades extra
  // - transform: convierte el body plano en instancias tipadas del DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Habilita los hooks de apagado para que PrismaService cierre
  // la conexión a la base de datos (onModuleDestroy) ante SIGTERM/SIGINT.
  app.enableShutdownHooks();

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
