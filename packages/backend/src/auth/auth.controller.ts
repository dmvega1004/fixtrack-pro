import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AuthResponse,
  AuthService,
  RegisterCompanyResponse,
} from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { SkipPasswordCheck } from './decorators/skip-password-check.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ProvisioningKeyGuard } from './guards/provisioning-key.guard';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register — alta de empresa + primer Admin. Da de alta
   * empresas nuevas en la base de producción, con clientes de terceros
   * conviviendo ahí, así que ya NO es de acceso libre:
   * - ProvisioningKeyGuard exige la cabecera x-provisioning-key (falla
   *   cerrado si PROVISIONING_KEY no está configurada — ver el guard).
   * - Límite de 3 intentos por hora por IP, más estricto que login: el
   *   ThrottlerGuard va PRIMERO en la lista para que cuente también los
   *   intentos con clave incorrecta, no solo los que pasan el candado.
   *
   * Sigue con @Public() porque no es un flujo de sesión JWT — quien lo
   * llama es el operador de la plataforma con la clave de
   * aprovisionamiento, no un usuario ya autenticado con un token.
   */
  @Public()
  @UseGuards(ThrottlerGuard, ProvisioningKeyGuard)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<RegisterCompanyResponse> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login — devuelve el JWT (público, 200 en vez de 201).
   * Rate-limitado aparte del resto de la API: 5 intentos por minuto por IP,
   * para frenar fuerza bruta sin arriesgar 429 en el resto de la app.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/me — devuelve el usuario del token, incluido
   * mustChangePassword: el frontend lo usa para saber si debe redirigir
   * a la pantalla de cambio obligatorio. @SkipPasswordCheck() porque esa
   * misma pantalla necesita poder llamarlo — si MustChangePasswordGuard
   * lo bloqueara, no habría forma de saber por qué está bloqueado.
   */
  @SkipPasswordCheck()
  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  /**
   * PATCH /auth/password — el usuario autenticado cambia SU PROPIA
   * contraseña (los tres roles: ADMIN, COORDINATOR, TECHNICIAN — sin
   * @Roles() la ruta queda abierta a cualquier rol autenticado, igual que
   * GET /auth/me). ChangePasswordDto no acepta ningún identificador de
   * usuario: `user` sale siempre del token, nunca del body.
   *
   * @SkipPasswordCheck(): es la ÚNICA salida que tiene un usuario con
   * mustChangePassword=true. Si este endpoint quedara bloqueado por
   * MustChangePasswordGuard, el usuario quedaría encerrado sin ninguna
   * forma de salir — solo arreglable desde la base de datos.
   *
   * Rate-limitado igual de estricto que login (5 intentos por minuto por
   * IP): sin esto, este endpoint sería una forma cómoda de adivinar la
   * contraseña actual de una sesión robada.
   */
  @SkipPasswordCheck()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('password')
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user, dto);
  }
}
