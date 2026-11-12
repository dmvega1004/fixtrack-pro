import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EquipmentPhoto, Prisma } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  cloudinaryRootFolder,
  CloudinaryService,
} from '../cloudinary/cloudinary.service';
import { validateImageFile } from '../cloudinary/validate-image-file';
import { EquipmentsService } from '../equipments/equipments.service';
import { PrismaService } from '../prisma.service';

/**
 * Lado más largo al subir — el mismo límite que las fotos de órdenes
 * (MAX_PHOTO_DIMENSION en AttachmentsService; no se importa de ahí para no
 * tocar ese módulo).
 */
const MAX_PHOTO_DIMENSION = 1600;

/** Galería de identificación, no archivo fotográfico: ese vive en las órdenes. */
export const MAX_PHOTOS_PER_EQUIPMENT = 10;

const LIMIT_MESSAGE =
  `El equipo ya tiene ${MAX_PHOTOS_PER_EQUIPMENT} fotos, el máximo. ` +
  'Un administrador o coordinador puede borrar una para agregar otra.';

export type EquipmentPhotoView = EquipmentPhoto & { isCover: boolean };

/** Respuesta de las operaciones que pueden mover la portada. */
export interface CoverResult {
  coverPhotoId: string | null;
}

/**
 * Galería de fotos del equipo con una marcada como portada
 * (Equipment.coverPhotoId). Este servicio es el ÚNICO que escribe
 * coverPhotoId, y es el que garantiza lo que la FK no puede: que la
 * portada sea una foto DE ESE equipo.
 *
 * Toda escritura que mira la galería (tope de 10, «la primera queda como
 * portada», reasignar la portada al borrar) bloquea antes la fila del
 * equipo con SELECT … FOR UPDATE: dos subidas simultáneas no pueden pasar
 * ambas el tope ni quedar ambas como «primera».
 *
 * La visibilidad del equipo la decide EquipmentsService.findOne (404 si es
 * de otra empresa); el candado multi-tenant aplica además en cada consulta.
 */
@Injectable()
export class EquipmentPhotosService {
  private readonly logger = new Logger(EquipmentPhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly equipmentsService: EquipmentsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async list(
    user: AuthenticatedUser,
    equipmentId: string,
  ): Promise<EquipmentPhotoView[]> {
    const equipment = await this.equipmentsService.findOne(
      user.companyId,
      equipmentId,
    );

    const photos = await this.prisma.equipmentPhoto.findMany({
      where: { equipmentId, companyId: user.companyId }, // candado
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return photos.map((photo) => ({
      ...photo,
      isCover: photo.id === equipment.coverPhotoId,
    }));
  }

  async add(
    user: AuthenticatedUser,
    equipmentId: string,
    file: Express.Multer.File | undefined,
  ): Promise<EquipmentPhotoView> {
    await this.equipmentsService.findOne(user.companyId, equipmentId);
    validateImageFile(file);

    // Chequeo previo, SIN bloqueo: solo para no gastar la subida a
    // Cloudinary cuando ya está lleno. El que manda es el de la transacción.
    const currentCount = await this.prisma.equipmentPhoto.count({
      where: { equipmentId, companyId: user.companyId },
    });
    if (currentCount >= MAX_PHOTOS_PER_EQUIPMENT) {
      throw new ConflictException(LIMIT_MESSAGE);
    }

    let uploaded;
    try {
      uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
        folder: `${cloudinaryRootFolder()}/${user.companyId}/equipment/${equipmentId}`,
        maxDimension: MAX_PHOTO_DIMENSION,
      });
    } catch (error) {
      this.logger.error(
        `Fallo al subir foto a Cloudinary (equipo ${equipmentId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'No se pudo subir la foto a nuestro proveedor de imágenes. ' +
          'Intenta de nuevo en unos minutos; si el problema persiste, contacta al administrador.',
      );
    }

    // Cloudinary terminó ANTES de abrir la transacción (llamada de red: no
    // debe retener una conexión del pool ni el bloqueo de la fila).
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockEquipment(tx, user.companyId, equipmentId);

        const count = await tx.equipmentPhoto.count({
          where: { equipmentId, companyId: user.companyId },
        });
        if (count >= MAX_PHOTOS_PER_EQUIPMENT) {
          throw new ConflictException(LIMIT_MESSAGE);
        }

        const photo = await tx.equipmentPhoto.create({
          data: {
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            equipmentId,
            companyId: user.companyId, // candado
            uploadedById: user.userId,
          },
        });

        // La primera foto queda como portada. Condicional en el WHERE: si
        // ya hay portada no cambia nada (count = 0).
        const { count: becameCover } = await tx.equipment.updateMany({
          where: {
            id: equipmentId,
            companyId: user.companyId,
            coverPhotoId: null,
          },
          data: { coverPhotoId: photo.id },
        });

        return { ...photo, isCover: becameCover === 1 };
      });
    } catch (error) {
      // La foto quedó en Cloudinary pero no en la BD: borrado compensatorio.
      // Sin reintentos; si falla, queda en el registro para limpiarlo a mano.
      await this.destroyOrLogOrphan(uploaded.public_id, equipmentId);
      throw error;
    }
  }

  async setCover(
    user: AuthenticatedUser,
    equipmentId: string,
    photoId: string,
  ): Promise<CoverResult> {
    await this.equipmentsService.findOne(user.companyId, equipmentId);

    return this.prisma.$transaction(async (tx) => {
      await this.lockEquipment(tx, user.companyId, equipmentId);

      // La regla que la FK no cubre: la foto tiene que ser DE este equipo.
      const photo = await tx.equipmentPhoto.findFirst({
        where: { id: photoId, equipmentId, companyId: user.companyId },
        select: { id: true },
      });
      if (!photo) {
        throw new NotFoundException(
          `Foto ${photoId} no encontrada en este equipo`,
        );
      }

      await tx.equipment.update({
        where: { id: equipmentId },
        data: { coverPhotoId: photo.id },
      });

      return { coverPhotoId: photo.id };
    });
  }

  async remove(
    user: AuthenticatedUser,
    equipmentId: string,
    photoId: string,
  ): Promise<CoverResult> {
    await this.equipmentsService.findOne(user.companyId, equipmentId);

    // BD primero (con el bloqueo), Cloudinary DESPUÉS y fuera de la
    // transacción: el peor caso es un recurso remoto huérfano, nunca una
    // miniatura rota apuntando a una foto que ya no existe.
    const { removed, coverPhotoId } = await this.prisma.$transaction(
      async (tx) => {
        const locked = await this.lockEquipment(
          tx,
          user.companyId,
          equipmentId,
        );

        const photo = await tx.equipmentPhoto.findFirst({
          where: { id: photoId, equipmentId, companyId: user.companyId },
        });
        if (!photo) {
          throw new NotFoundException(
            `Foto ${photoId} no encontrada en este equipo`,
          );
        }

        // Si era la portada, la FK (SetNull) deja coverPhotoId en null.
        await tx.equipmentPhoto.delete({ where: { id: photo.id } });

        if (locked.coverPhotoId !== photo.id) {
          return { removed: photo, coverPhotoId: locked.coverPhotoId };
        }

        // Era la portada: pasa a serlo la más reciente de las que quedan;
        // si no queda ninguna, se queda en null.
        const next = await tx.equipmentPhoto.findFirst({
          where: { equipmentId, companyId: user.companyId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { id: true },
        });
        if (next) {
          await tx.equipment.update({
            where: { id: equipmentId },
            data: { coverPhotoId: next.id },
          });
        }
        return { removed: photo, coverPhotoId: next?.id ?? null };
      },
    );

    await this.destroyOrLogOrphan(removed.publicId, equipmentId);

    return { coverPhotoId };
  }

  /**
   * SELECT … FOR UPDATE sobre la fila del equipo: serializa las escrituras
   * de la galería de ESE equipo hasta que la transacción termine. Devuelve
   * la portada leída bajo el bloqueo (la vigente, no la de antes de esperar).
   */
  private async lockEquipment(
    tx: Prisma.TransactionClient,
    companyId: string,
    equipmentId: string,
  ): Promise<{ coverPhotoId: string | null }> {
    const rows = await tx.$queryRaw<{ coverPhotoId: string | null }[]>`
      SELECT "coverPhotoId" FROM "Equipment"
      WHERE id = ${equipmentId} AND "companyId" = ${companyId}
      FOR UPDATE`;
    if (rows.length === 0) {
      // Borrado entre el findOne y el bloqueo.
      throw new NotFoundException(`Equipo ${equipmentId} no encontrado`);
    }
    return rows[0];
  }

  private async destroyOrLogOrphan(
    publicId: string,
    equipmentId: string,
  ): Promise<void> {
    const ok = await this.cloudinary.tryDestroy(publicId);
    if (!ok) {
      // Prefijo fijo para encontrarlo en los logs de Railway y limpiarlo.
      // ANTES DE BORRAR A MANO: comprobar que el recurso EXISTE. tryDestroy
      // devuelve false también cuando Cloudinary sí borró pero la respuesta
      // no llegó (timeout, red cortada, equipo suspendido): falsos
      // positivos reales — 2 de 3 en la limpieza del 2026-11-11 ya no
      // estaban. Consultar con cloudinary.api.resource(publicId) primero.
      this.logger.error(
        `CLOUDINARY_ORPHAN publicId=${publicId} equipo=${equipmentId}: ` +
          'no se pudo borrar el recurso en Cloudinary; quedó huérfano, limpiarlo a mano.',
      );
    }
  }
}
