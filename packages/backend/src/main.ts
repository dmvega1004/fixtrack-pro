import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
