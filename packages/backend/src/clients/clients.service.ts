import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client, Prisma } from 'database';
import { PrismaService } from '../prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

/**
 * REGLA DE ORO MULTI-TENANT:
 * Todos los métodos reciben `companyId` como PRIMER parámetro obligatorio
 * y lo aplican en cada consulta Prisma. Es imposible invocar este servicio
 * sin el candado del tenant.
 */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  create(companyId: string, dto: CreateClientDto): Promise<Client> {
    return this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone?.trim(),
        documentType: dto.documentType,
        documentNumber: dto.documentNumber?.trim(),
        address: dto.address?.trim(),
        paymentTermDays: dto.paymentTermDays,
        companyId, // candado: el cliente nace amarrado al tenant del token
      },
    });
  }

  findAll(companyId: string): Promise<Client[]> {
    return this.prisma.client.findMany({
      where: { companyId }, // candado: solo clientes de MI empresa
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * findFirst (no findUnique) para poder combinar id + companyId.
   * Un cliente de OTRA empresa devuelve 404 — para el atacante es
   * indistinguible de un cliente inexistente (no filtramos información).
   */
  async findOne(companyId: string, id: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId }, // candado
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }

    return client;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    // Verifica pertenencia al tenant ANTES de tocar el registro (404 si es ajeno)
    await this.findOne(companyId, id);

    return this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone?.trim(),
        documentType: dto.documentType,
        documentNumber: dto.documentNumber?.trim(),
        address: dto.address?.trim(),
        paymentTermDays: dto.paymentTermDays,
      },
    });
  }

  async remove(companyId: string, id: string): Promise<Client> {
    // Verifica pertenencia al tenant ANTES de eliminar
    await this.findOne(companyId, id);

    try {
      return await this.prisma.client.delete({ where: { id } });
    } catch (error) {
      // P2003: violación de FK (onDelete: Restrict) — el cliente tiene equipos
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: el cliente tiene equipos registrados. ' +
            'Reasigna o elimina sus equipos primero.',
        );
      }
      throw error;
    }
  }
}
