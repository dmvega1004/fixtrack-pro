import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthResponse, AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
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
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
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

  /** GET /auth/me — ruta protegida de prueba: devuelve el usuario del token */
  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
