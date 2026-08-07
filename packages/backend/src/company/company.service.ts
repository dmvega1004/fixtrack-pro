import { Injectable } from '@nestjs/common';
import { Company } from 'database';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateImageFile } from '../cloudinary/validate-image-file';
import { PrismaService } from '../prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

/** Lado máximo del logo: no necesita ser una foto de alta resolución. */
const MAX_LOGO_DIMENSION = 512;

/** Proyección pública: sin el contador interno nextOrderNumber. */
const COMPANY_SELECT = {
  id: true,
  name: true,
  slogan: true,
  phone: true,
  email: true,
  address: true,
  website: true,
  logoUrl: true,
  currency: true,
  taxRate: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PublicCompany = Pick<
  Company,
  | 'id'
  | 'name'
  | 'slogan'
  | 'phone'
  | 'email'
  | 'address'
  | 'website'
  | 'logoUrl'
  | 'currency'
  | 'taxRate'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * Módulo de datos del tenant: membrete para documentos (PDF) y ajustes
 * generales de la empresa. `companyId` siempre viene del token — nunca
 * del body ni de la URL — porque este recurso es siempre "el mío".
 */
@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  findMe(companyId: string): Promise<PublicCompany> {
    return this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: COMPANY_SELECT,
    });
  }

  update(companyId: string, dto: UpdateCompanyDto): Promise<PublicCompany> {
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: dto.name?.trim(),
        slogan: dto.slogan?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.toLowerCase().trim(),
        address: dto.address?.trim(),
        website: dto.website?.trim(),
        currency: dto.currency,
        taxRate: dto.taxRate,
      },
      select: COMPANY_SELECT,
    });
  }

  /**
   * Sube el nuevo logo a Cloudinary, actualiza Company.logoUrl y borra el
   * logo anterior en Cloudinary — pero solo si era realmente un archivo
   * nuestro: si logoUrl apuntaba a una ruta local legacy (ej. "/tenant/...")
   * u otra URL ajena, extractPublicId devuelve null y simplemente se
   * reemplaza el valor sin intentar borrar nada.
   */
  async updateLogo(
    companyId: string,
    file: Express.Multer.File | undefined,
  ): Promise<PublicCompany> {
    validateImageFile(file);

    const current = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { logoUrl: true },
    });

    const uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: `fixtrack/${companyId}/brand`,
      maxDimension: MAX_LOGO_DIMENSION,
    });

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: { logoUrl: uploaded.secure_url },
      select: COMPANY_SELECT,
    });

    if (current.logoUrl) {
      const oldPublicId = this.cloudinary.extractPublicId(current.logoUrl);
      if (oldPublicId) {
        await this.cloudinary.destroy(oldPublicId);
      }
    }

    return updated;
  }
}
