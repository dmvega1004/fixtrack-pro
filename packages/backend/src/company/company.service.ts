import { Injectable } from '@nestjs/common';
import { Company } from 'database';
import { cloudinaryRootFolder, CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateImageFile } from '../cloudinary/validate-image-file';
import { PrismaService } from '../prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

/** Lado máximo del logo: no necesita ser una foto de alta resolución. */
const MAX_LOGO_DIMENSION = 512;

/**
 * Lado máximo de la firma: suficiente para verse nítida impresa a ~50mm
 * de ancho (ver SIGNATURE preset en cloudinary-url.ts del frontend), sin
 * guardar un archivo de escaneo gigante.
 */
const MAX_SIGNATURE_DIMENSION = 1000;

/**
 * Proyección pública: sin el contador interno nextOrderNumber.
 * nextCollectionNumber SÍ es público (a diferencia de nextOrderNumber):
 * "Mi empresa" lo muestra y permite editarlo (número desde el cual
 * iniciar la numeración de cuentas de cobro).
 */
const COMPANY_SELECT = {
  id: true,
  name: true,
  slogan: true,
  taxId: true,
  phone: true,
  email: true,
  address: true,
  website: true,
  logoUrl: true,
  signatureImageUrl: true,
  signatureInCollection: true,
  signatureInWorkOrder: true,
  signatureInQuote: true,
  currency: true,
  taxRate: true,
  collectionDocTitle: true,
  payeeName: true,
  payeeDocument: true,
  bankName: true,
  bankAccount: true,
  signerName: true,
  signerRole: true,
  collectionDocFootnote: true,
  nextCollectionNumber: true,
  nextQuoteNumber: true,
  defaultPaymentTerms: true,
  defaultDeliveryTime: true,
  defaultWarrantyTerms: true,
  defaultExclusions: true,
  defaultValidityDays: true,
  quoteFollowUpDays: true,
  quoteFootnote: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PublicCompany = Pick<
  Company,
  | 'id'
  | 'name'
  | 'slogan'
  | 'taxId'
  | 'phone'
  | 'email'
  | 'address'
  | 'website'
  | 'logoUrl'
  | 'signatureImageUrl'
  | 'signatureInCollection'
  | 'signatureInWorkOrder'
  | 'signatureInQuote'
  | 'currency'
  | 'taxRate'
  | 'collectionDocTitle'
  | 'payeeName'
  | 'payeeDocument'
  | 'bankName'
  | 'bankAccount'
  | 'signerName'
  | 'signerRole'
  | 'collectionDocFootnote'
  | 'nextCollectionNumber'
  | 'nextQuoteNumber'
  | 'defaultPaymentTerms'
  | 'defaultDeliveryTime'
  | 'defaultWarrantyTerms'
  | 'defaultExclusions'
  | 'defaultValidityDays'
  | 'quoteFollowUpDays'
  | 'quoteFootnote'
  | 'createdAt'
  | 'updatedAt'
>;

export type CompanyUpdateResult = PublicCompany & {
  /** Presente si nextCollectionNumber quedó en o por debajo de un número
   * de cuenta de cobro ya emitido — riesgo de duplicado, no bloquea el guardado. */
  collectionNumberWarning?: string;
};

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

  async update(
    companyId: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyUpdateResult> {
    // Advertencia (no bloqueante): si el nuevo nextCollectionNumber queda
    // en o por debajo de un número ya emitido, el próximo documento
    // generado podría chocar con el @@unique([companyId, collectionNumber])
    // — mejor avisar acá que dejar que reviente en el momento de generar.
    let collectionNumberWarning: string | undefined;
    if (dto.nextCollectionNumber !== undefined) {
      const { _max } = await this.prisma.workOrder.aggregate({
        where: { companyId, collectionNumber: { not: null } }, // candado
        _max: { collectionNumber: true },
      });
      if (
        _max.collectionNumber !== null &&
        dto.nextCollectionNumber <= _max.collectionNumber
      ) {
        collectionNumberWarning =
          `Ya existe una cuenta de cobro con el número ${_max.collectionNumber}. ` +
          `Si continúas, el próximo documento generado podría repetir un número ya emitido.`;
      }
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        name: dto.name?.trim(),
        slogan: dto.slogan?.trim(),
        taxId: dto.taxId?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.toLowerCase().trim(),
        address: dto.address?.trim(),
        website: dto.website?.trim(),
        currency: dto.currency,
        taxRate: dto.taxRate,
        collectionDocTitle: dto.collectionDocTitle?.trim(),
        payeeName: dto.payeeName?.trim(),
        payeeDocument: dto.payeeDocument?.trim(),
        bankName: dto.bankName?.trim(),
        bankAccount: dto.bankAccount?.trim(),
        signerName: dto.signerName?.trim(),
        signerRole: dto.signerRole?.trim(),
        collectionDocFootnote: dto.collectionDocFootnote?.trim(),
        signatureInCollection: dto.signatureInCollection,
        signatureInWorkOrder: dto.signatureInWorkOrder,
        signatureInQuote: dto.signatureInQuote,
        nextCollectionNumber: dto.nextCollectionNumber,
        nextQuoteNumber: dto.nextQuoteNumber,
        defaultPaymentTerms: dto.defaultPaymentTerms?.trim(),
        defaultDeliveryTime: dto.defaultDeliveryTime?.trim(),
        defaultWarrantyTerms: dto.defaultWarrantyTerms?.trim(),
        defaultExclusions: dto.defaultExclusions?.trim(),
        defaultValidityDays: dto.defaultValidityDays,
        quoteFollowUpDays: dto.quoteFollowUpDays,
        quoteFootnote: dto.quoteFootnote?.trim(),
      },
      select: COMPANY_SELECT,
    });

    return {
      ...updated,
      ...(collectionNumberWarning && { collectionNumberWarning }),
    };
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
      folder: `${cloudinaryRootFolder()}/${companyId}/brand`,
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

  /**
   * Sube la nueva firma a Cloudinary y actualiza Company.signatureImageUrl
   * — mismo patrón que updateLogo (incluido el borrado best-effort de la
   * firma anterior). Solo PNG (ver validateImageFile): a diferencia del
   * logo, esta imagen se estampa sobre documentos reales, así que exige
   * el formato que admite fondo transparente.
   */
  async updateSignature(
    companyId: string,
    file: Express.Multer.File | undefined,
  ): Promise<PublicCompany> {
    validateImageFile(file, ['image/png']);

    const current = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { signatureImageUrl: true },
    });

    const uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: `${cloudinaryRootFolder()}/${companyId}/brand`,
      maxDimension: MAX_SIGNATURE_DIMENSION,
    });

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: { signatureImageUrl: uploaded.secure_url },
      select: COMPANY_SELECT,
    });

    if (current.signatureImageUrl) {
      const oldPublicId = this.cloudinary.extractPublicId(
        current.signatureImageUrl,
      );
      if (oldPublicId) {
        await this.cloudinary.destroy(oldPublicId);
      }
    }

    return updated;
  }
}
