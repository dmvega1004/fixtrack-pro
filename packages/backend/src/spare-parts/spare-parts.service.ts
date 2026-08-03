import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, SparePart } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';

/**
 * Vista del repuesto con el costo opcionalmente omitido.
 * RBAC financiero: `cost` (lo que paga la empresa) es dato de ADMIN;
 * Coordinadores y Técnicos ven salePrice, stock y minStock.
 */
export type SparePartView = Omit<SparePart, 'cost'> & {
  cost?: SparePart['cost'];
};

@Injectable()
export class SparePartsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateSparePartDto,
  ): Promise<SparePartView> {
    try {
      const part = await this.prisma.sparePart.create({
        data: {
          sku: dto.sku.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description?.trim(),
          category: dto.category,
          stock: dto.stock,
          minStock: dto.minStock ?? 0,
          cost: dto.cost,
          salePrice: dto.salePrice,
          companyId: user.companyId, // candado
        },
      });
      return this.redact(part, user.role);
    } catch (error) {
      // P2002: violación del unique compuesto [companyId, sku]
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe un repuesto con el SKU ${dto.sku.trim().toUpperCase()} en tu empresa`,
        );
      }
      throw error;
    }
  }

  async findAll(
    user: AuthenticatedUser,
    lowStock?: boolean,
  ): Promise<SparePartView[]> {
    const parts = await this.prisma.sparePart.findMany({
      where: {
        companyId: user.companyId, // candado
        // Alerta de reabastecimiento: stock <= minStock (comparación entre columnas)
        ...(lowStock
          ? { stock: { lte: this.prisma.sparePart.fields.minStock } }
          : {}),
      },
      orderBy: { name: 'asc' },
    });

    return parts.map((p) => this.redact(p, user.role));
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<SparePartView> {
    const part = await this.prisma.sparePart.findFirst({
      where: { id, companyId: user.companyId }, // candado
    });

    if (!part) {
      throw new NotFoundException(`Repuesto ${id} no encontrado`);
    }

    return this.redact(part, user.role);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateSparePartDto,
  ): Promise<SparePartView> {
    await this.findOne(user, id); // pertenencia al tenant (404 si es ajeno)

    try {
      const part = await this.prisma.sparePart.update({
        where: { id },
        data: {
          sku: dto.sku?.trim().toUpperCase(),
          name: dto.name?.trim(),
          description: dto.description?.trim(),
          category: dto.category,
          stock: dto.stock,
          minStock: dto.minStock,
          cost: dto.cost,
          salePrice: dto.salePrice,
        },
      });
      return this.redact(part, user.role);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe otro repuesto con ese SKU en tu empresa',
        );
      }
      throw error;
    }
  }

  async remove(user: AuthenticatedUser, id: string): Promise<SparePartView> {
    await this.findOne(user, id); // pertenencia al tenant

    try {
      const part = await this.prisma.sparePart.delete({ where: { id } });
      return this.redact(part, user.role);
    } catch (error) {
      // P2003: el repuesto aparece en órdenes de trabajo (historial contable)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: el repuesto está registrado en órdenes de trabajo. ' +
            'El historial contable es inmutable.',
        );
      }
      throw error;
    }
  }

  /** RBAC financiero: omite `cost` para todo rol distinto de ADMIN. */
  private redact(part: SparePart, role: Role): SparePartView {
    if (role === Role.ADMIN) {
      return part;
    }
    const { cost: _cost, ...rest } = part;
    return rest;
  }
}
