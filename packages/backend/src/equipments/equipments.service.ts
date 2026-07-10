import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Equipment, Prisma } from 'database';
import { PrismaService } from '../prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

/** Datos mínimos del cliente que acompañan a cada equipo en las respuestas. */
const CLIENT_SUMMARY = {
  client: { select: { id: true, name: true } },
} as const;

/**
 * REGLA DE ORO MULTI-TENANT: `companyId` es el primer parámetro
 * obligatorio de todos los métodos y se aplica en cada consulta.
 * Además, toda relación (clientId) se verifica contra el tenant:
 * no se puede colgar un equipo de un cliente de OTRA empresa.
 */
@Injectable()
export class EquipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateEquipmentDto): Promise<Equipment> {
    // Validación cruzada: el cliente debe pertenecer a MI empresa
    await this.ensureClientBelongsToCompany(companyId, dto.clientId);

    return this.prisma.equipment.create({
      data: {
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        serialNumber: dto.serialNumber?.trim(),
        status: dto.status, // undefined → Prisma aplica el default ACTIVE
        clientId: dto.clientId,
        companyId, // candado: el equipo nace amarrado al tenant del token
        // qrCode: lo genera la BD automáticamente (@default(uuid()))
      },
      include: CLIENT_SUMMARY,
    });
  }

  findAll(companyId: string): Promise<Equipment[]> {
    return this.prisma.equipment.findMany({
      where: { companyId }, // candado
      include: CLIENT_SUMMARY,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string): Promise<Equipment> {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, companyId }, // candado
      include: CLIENT_SUMMARY,
    });

    if (!equipment) {
      throw new NotFoundException(`Equipo ${id} no encontrado`);
    }

    return equipment;
  }

  /**
   * Búsqueda por código QR — base del escáner del Módulo 3.
   * El técnico escanea la etiqueta física y llega directo al equipo.
   * El candado companyId aplica igual: un QR de otra empresa da 404.
   */
  async findByQrCode(companyId: string, qrCode: string): Promise<Equipment> {
    const equipment = await this.prisma.equipment.findFirst({
      where: { qrCode, companyId }, // candado
      include: CLIENT_SUMMARY,
    });

    if (!equipment) {
      throw new NotFoundException(
        'No existe ningún equipo con ese código QR en tu empresa',
      );
    }

    return equipment;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    // Verifica pertenencia del equipo al tenant (404 si es ajeno)
    await this.findOne(companyId, id);

    // Si reasignan el equipo a otro cliente, ese cliente también debe ser del tenant
    if (dto.clientId) {
      await this.ensureClientBelongsToCompany(companyId, dto.clientId);
    }

    return this.prisma.equipment.update({
      where: { id },
      data: {
        brand: dto.brand?.trim(),
        model: dto.model?.trim(),
        serialNumber: dto.serialNumber?.trim(),
        status: dto.status,
        clientId: dto.clientId,
      },
      include: CLIENT_SUMMARY,
    });
  }

  async remove(companyId: string, id: string): Promise<Equipment> {
    // Verifica pertenencia al tenant ANTES de eliminar
    await this.findOne(companyId, id);

    try {
      return await this.prisma.equipment.delete({ where: { id } });
    } catch (error) {
      // P2003: violación de FK — el equipo tiene órdenes de trabajo
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: el equipo tiene órdenes de trabajo asociadas. ' +
            'Cierra o elimina sus órdenes primero.',
        );
      }
      throw error;
    }
  }

  /** Validación cruzada multi-tenant de la relación Equipment → Client. */
  private async ensureClientBelongsToCompany(
    companyId: string,
    clientId: string,
  ): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, companyId }, // candado
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException(
        `Cliente ${clientId} no encontrado en tu empresa`,
      );
    }
  }
}
