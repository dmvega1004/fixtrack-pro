import { Injectable } from '@nestjs/common';
import { ActivityAction, ActivityLog, Prisma, Role } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma.service';

export interface RecordActivityParams {
  companyId: string;
  workOrderId: string;
  /** Autor del evento; null si el sistema lo genera sin un usuario detrás. */
  userId: string | null;
  userName: string;
  action: ActivityAction;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
  /** Marca el evento como financiero AL ESCRIBIRLO (default false). */
  isFinancial?: boolean;
}

/**
 * Bitácora de auditoría de la orden: quién la modificó, qué cambió y
 * cuándo. Tabla de SOLO INSERCIÓN — a propósito no existen métodos de
 * actualización ni borrado individual acá. El único borrado posible es en
 * cascada al eliminar la orden (ver onDelete: Cascade en schema.prisma).
 */
@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Escribe un evento. Acepta OPCIONALMENTE el cliente de una transacción
   * en curso — si el cambio que se registra ocurre dentro de un
   * $transaction, el log DEBE escribirse con ese mismo cliente, o puede
   * quedar un registro de un cambio que terminó revertido.
   */
  async record(
    params: RecordActivityParams,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.activityLog.create({
      data: {
        companyId: params.companyId,
        workOrderId: params.workOrderId,
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        field: params.field,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
        isFinancial: params.isFinancial ?? false,
      },
    });
  }

  /**
   * Como record(), pero compara oldValue/newValue y NO escribe nada si son
   * iguales — así editar un campo sin cambiar su valor no ensucia la
   * bitácora.
   */
  async recordFieldChange(
    params: RecordActivityParams,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if ((params.oldValue ?? null) === (params.newValue ?? null)) return;
    await this.record(params, tx);
  }

  /**
   * GET /work-orders/:id/activity. La visibilidad de la orden (multi-tenant
   * + "el técnico solo ve SUS órdenes") la decide siempre
   * WorkOrdersService.findOne — este método nunca reimplementa esa regla,
   * solo aplica el candado companyId y, para TECHNICIAN, oculta los eventos
   * financieros EN LA CONSULTA (nunca llegan al navegador, ni siquiera para
   * que el frontend los filtre).
   */
  findAllForWorkOrder(
    user: AuthenticatedUser,
    workOrderId: string,
  ): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: {
        workOrderId,
        companyId: user.companyId, // candado
        ...(user.role === Role.TECHNICIAN ? { isFinancial: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
