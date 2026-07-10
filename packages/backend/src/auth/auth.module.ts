import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Valida y tipa la expiración del token.
 * `process.env` siempre devuelve `string`, pero @nestjs/jwt exige el tipo
 * StringValue de la librería `ms` (ej. "8h", "30m", "7d"). Validamos el
 * formato en el arranque (fail-fast) y solo entonces afirmamos el tipo.
 */
function getJwtExpiresIn(): JwtSignOptions['expiresIn'] {
  const raw = process.env.JWT_EXPIRES_IN ?? '8h';
  const MS_FORMAT = /^\d+(\.\d+)?(ms|s|m|h|d|w|y)?$/i;
  if (!MS_FORMAT.test(raw)) {
    throw new Error(
      `FATAL: JWT_EXPIRES_IN tiene un formato inválido: "${raw}". ` +
        'Usa un número seguido de unidad, por ejemplo "8h", "30m" o "7d".',
    );
  }
  return raw as JwtSignOptions['expiresIn'];
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (): JwtModuleOptions => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'FATAL: La variable de entorno JWT_SECRET no está definida. ' +
              'Agrégala al archivo .env de packages/backend.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: getJwtExpiresIn(),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
