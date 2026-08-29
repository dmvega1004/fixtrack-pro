import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from 'database';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_IMAGE_SIZE_BYTES } from '../cloudinary/image-upload.constants';
import {
  CompanyService,
  CompanyUpdateResult,
  PublicCompany,
} from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

/**
 * Sin @Public(): exige JWT (guard global). El companyId NUNCA viene del
 * body ni de la URL: siempre se extrae del token vía @CurrentUser — este
 * recurso solo existe en su forma "me" (el tenant de la sesión).
 */
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /** GET /company/me — los 3 roles: datos para membretes y UI. */
  @Get('me')
  findMe(@CurrentUser('companyId') companyId: string): Promise<PublicCompany> {
    return this.companyService.findMe(companyId);
  }

  /** PATCH /company/me — SOLO Administradores. */
  @Roles(Role.ADMIN)
  @Patch('me')
  update(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyUpdateResult> {
    return this.companyService.update(companyId, dto);
  }

  /** POST /company/logo — SOLO Administradores, multipart. */
  @Roles(Role.ADMIN)
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  uploadLogo(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PublicCompany> {
    return this.companyService.updateLogo(companyId, file);
  }

  /**
   * POST /company/signature — SOLO Administradores, multipart. La firma
   * compromete a la empresa (queda estampada en documentos que salen sin
   * revisión humana), así que ni el coordinador puede tocarla.
   */
  @Roles(Role.ADMIN)
  @Post('signature')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  uploadSignature(
    @CurrentUser('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PublicCompany> {
    return this.companyService.updateSignature(companyId, file);
  }
}
