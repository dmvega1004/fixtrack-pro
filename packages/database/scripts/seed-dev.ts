/**
 * Escenario de datos de prueba para desarrollo local.
 *
 * Crea UN tenant ficticio ("Taller Demo FixTrack S.A.S.") con usuarios,
 * clientes, equipos, repuestos y 12 órdenes que cubren todos los casos que
 * hay que poder probar sin inventar datos a mano (ver README: Entornos).
 *
 * IDEMPOTENTE: borra el tenant de desarrollo (identificado por un id fijo,
 * DEMO_COMPANY_ID) y todo lo que cuelga de él, y lo vuelve a crear desde
 * cero. Se puede correr las veces que haga falta — siempre deja el mismo
 * escenario.
 *
 * Uso:
 *   pnpm --filter database run seed:dev
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

import { assertDevelopment } from './guards';
// Primera operación del script, antes de leer o conectar nada más: corta
// la ejecución si esto no es inequívocamente la base local de desarrollo.
try {
  assertDevelopment();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

import {
  PrismaClient,
  Role,
  OrderStatus,
  Priority,
  PaymentMethod,
  ActivityAction,
} from '../index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

/** Mismo costo de hash que auth.service.ts — no tiene sentido un hash más barato aquí. */
const BCRYPT_SALT_ROUNDS = 12;

/** Contraseña única y documentada para los 3 usuarios de desarrollo (ver README: Entornos). */
export const DEV_PASSWORD = 'FixtrackDemo123!';

/**
 * Id fijo del tenant de desarrollo: permite borrar exactamente ESTE tenant
 * en cada corrida sin depender de buscarlo por nombre (que alguien podría
 * editar). No colisiona con datos reales — es un uuid que nunca genera
 * @default(uuid()) de Prisma.
 */
const DEMO_COMPANY_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_COMPANY_NAME = 'Taller Demo FixTrack S.A.S.';

/**
 * Consecutivos de orden y de cuenta de cobro MUY distintos a los de TAELCO
 * a propósito — para que nadie confunda una pantalla de datos ficticios
 * con datos reales de producción con solo mirar el número.
 */
const ORDER_NUMBER_START = 7000;
const COLLECTION_NUMBER_START = 9000;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Misma fórmula que packages/backend/src/work-orders/billing.util.ts, en números planos. */
function calcTotal(
  labor: number,
  partsTotal: number,
  additional: number,
  discount: number,
  taxRate: number,
) {
  const subtotal = labor + partsTotal + additional - discount;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL as string;
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(
      async (tx) => {
        // --- 1. Limpieza idempotente del tenant de desarrollo ---
        // Orden por dependencias de FK (mismo criterio que reset-pilot.ts).
        // WorkOrderEquipment/Payment/ActivityLog cascadean al borrar WorkOrder,
        // pero se borran explícito para no depender implícitamente de eso.
        await tx.attachment.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.payment.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.activityLog.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.workOrderEquipment.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.workOrderPart.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.workOrderRetention.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.workOrder.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.equipment.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.clientRetention.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.client.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.sparePart.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.user.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        // Retention no tiene onDelete: Cascade hacia Company (a propósito, mismo
        // criterio que el resto del catálogo del tenant): hay que vaciarla
        // explícito antes de poder borrar la empresa.
        await tx.retention.deleteMany({ where: { companyId: DEMO_COMPANY_ID } });
        await tx.company.deleteMany({ where: { id: DEMO_COMPANY_ID } });

        // --- 2. Empresa ficticia, con IVA y datos de cuenta de cobro ---
        const company = await tx.company.create({
          data: {
            id: DEMO_COMPANY_ID,
            name: DEMO_COMPANY_NAME,
            slogan: 'Empresa de demostración — datos ficticios, no reales',
            phone: '300 000 0000',
            email: 'contacto@demo.example.com',
            address: 'Calle Demo 0 # 0-00, Ciudad Ejemplo',
            website: 'https://demo.example.com',
            currency: 'COP',
            taxRate: 19,
            collectionDocTitle: 'Cuenta de cobro',
            payeeName: DEMO_COMPANY_NAME,
            payeeDocument: '900000000-0',
            bankName: 'Banco Ejemplo',
            bankAccount: '000-0000000-00',
            signerName: 'Persona Demo',
            signerRole: 'Representante Legal Demo',
          },
        });

        // --- 3. Usuarios: ADMIN, COORDINATOR, TECHNICIAN ---
        const passwordHash = await bcrypt.hash(DEV_PASSWORD, BCRYPT_SALT_ROUNDS);
        await tx.user.create({
          data: {
            companyId: company.id,
            name: 'Admin Demo',
            email: 'admin@example.com',
            password: passwordHash,
            role: Role.ADMIN,
          },
        });
        const coordinator = await tx.user.create({
          data: {
            companyId: company.id,
            name: 'Coordinador Demo',
            email: 'coordinador@example.com',
            password: passwordHash,
            role: Role.COORDINATOR,
          },
        });
        const technician = await tx.user.create({
          data: {
            companyId: company.id,
            name: 'Técnico Demo',
            email: 'tecnico@example.com',
            password: passwordHash,
            role: Role.TECHNICIAN,
          },
        });

        // --- 4. Clientes: 4, con distintos días de crédito (incl. 0) ---
        const client1 = await tx.client.create({
          data: {
            companyId: company.id,
            name: 'Comercial Ejemplo Uno S.A.S.',
            email: 'contacto@ejemplouno.example.com',
            phone: '301 111 1111',
            documentType: 'NIT',
            documentNumber: '900111222-1',
            address: 'Cra 1 # 1-11, Ciudad Ejemplo',
            paymentTermDays: 0,
          },
        });
        const client2 = await tx.client.create({
          data: {
            companyId: company.id,
            name: 'Distribuidora Ejemplo Dos Ltda.',
            email: 'contacto@ejemplodos.example.com',
            phone: '302 222 2222',
            documentType: 'NIT',
            documentNumber: '900222333-2',
            address: 'Cra 2 # 2-22, Ciudad Ejemplo',
            paymentTermDays: 15,
          },
        });
        const client3 = await tx.client.create({
          data: {
            companyId: company.id,
            name: 'Servicios Ejemplo Tres S.A.S.',
            email: 'contacto@ejemplotres.example.com',
            phone: '303 333 3333',
            documentType: 'NIT',
            documentNumber: '900333444-3',
            address: 'Cra 3 # 3-33, Ciudad Ejemplo',
            paymentTermDays: 30,
          },
        });
        const client4 = await tx.client.create({
          data: {
            companyId: company.id,
            name: 'Fundación Ejemplo Cuatro',
            email: 'contacto@ejemplocuatro.example.com',
            phone: '304 444 4444',
            documentType: 'NIT',
            documentNumber: '900444555-4',
            address: 'Cra 4 # 4-44, Ciudad Ejemplo',
            paymentTermDays: 60,
          },
        });

        // --- 5. Equipos: 8, repartidos entre los 4 clientes ---
        const eq = {
          c1a: await tx.equipment.create({
            data: {
              companyId: company.id,
              clientId: client1.id,
              brand: 'Marca Demo Alfa',
              model: 'Nevera Exhibidora NX-100',
              serialNumber: 'DEMO-SN-0001',
              location: 'Local Demo 101, Centro Comercial Ejemplo',
            },
          }),
          c1b: await tx.equipment.create({
            data: {
              companyId: company.id,
              clientId: client1.id,
              brand: 'Marca Demo Alfa',
              model: 'Lavadora Industrial LI-40',
              serialNumber: 'DEMO-SN-0002',
              location: 'Local Demo 101, Centro Comercial Ejemplo',
            },
          }),
          c2a: await tx.equipment.create({
            data: {
              companyId: company.id,
              clientId: client2.id,
              brand: 'Marca Demo Beta',
              model: 'Aire Acondicionado AC-200',
              serialNumber: 'DEMO-SN-0003',
              location: 'Bodega Demo 2, Zona Ejemplo',
            },
          }),
          c2b: await tx.equipment.create({
            data: {
              companyId: company.id,
              clientId: client2.id,
              brand: 'Marca Demo Beta',
              model: 'Aire Acondicionado AC-200',
              serialNumber: 'DEMO-SN-0004',
              location: 'Bodega Demo 2, Zona Ejemplo',
            },
          }),
          c3a: await tx.equipment.create({
            data: {
              companyId: company.id,
              clientId: client3.id,
              brand: 'Marca Demo Gamma',
              model: 'Cuarto Frío CF-500',
              serialNumber: 'DEMO-SN-0005',
              location: 'Sede Demo 3, Piso 1',
            },
          }),
          c3b: await tx.equipment.create({
            data: {
              companyId: company.id,
              clientId: client3.id,
              brand: 'Marca Demo Gamma',
              model: 'Congelador Horizontal CH-300',
              serialNumber: 'DEMO-SN-0006',
              location: 'Sede Demo 3, Piso 1',
            },
          }),
          c4a: await tx.equipment.create({
            data: {
              companyId: company.id,
              clientId: client4.id,
              brand: 'Marca Demo Delta',
              model: 'Horno Industrial HI-700',
              serialNumber: 'DEMO-SN-0007',
              location: 'Sede Demo 4, Cocina',
            },
          }),
          c4b: await tx.equipment.create({
            data: {
              companyId: company.id,
              clientId: client4.id,
              brand: 'Marca Demo Delta',
              model: 'Split Decorativo SD-900',
              serialNumber: 'DEMO-SN-0008',
              location: 'Sede Demo 4, Auditorio',
            },
          }),
        };

        // --- 6. Repuestos: 10, al menos 2 por debajo del stock mínimo ---
        const parts = {
          compresor: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-001',
              name: 'Compresor 1/4 HP',
              category: 'REPUESTO',
              stock: 2, // por debajo del mínimo
              minStock: 5,
              cost: 150000,
              salePrice: 220000,
            },
          }),
          filtro: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-002',
              name: 'Filtro Secador',
              category: 'REPUESTO',
              stock: 20,
              minStock: 5,
              cost: 15000,
              salePrice: 30000,
            },
          }),
          gas: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-003',
              name: 'Gas Refrigerante R410A (kg)',
              category: 'CONSUMIBLE',
              stock: 1, // por debajo del mínimo
              minStock: 4,
              cost: 45000,
              salePrice: 70000,
            },
          }),
          termostato: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-004',
              name: 'Termostato Digital',
              category: 'REPUESTO',
              stock: 12,
              minStock: 3,
              cost: 60000,
              salePrice: 95000,
            },
          }),
          correa: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-005',
              name: 'Correa de Motor',
              category: 'REPUESTO',
              stock: 8,
              minStock: 2,
              cost: 20000,
              salePrice: 35000,
            },
          }),
          valvula: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-006',
              name: 'Válvula de Expansión',
              category: 'REPUESTO',
              stock: 6,
              minStock: 2,
              cost: 40000,
              salePrice: 65000,
            },
          }),
          capacitor: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-007',
              name: 'Capacitor 35uF',
              category: 'REPUESTO',
              stock: 15,
              minStock: 5,
              cost: 12000,
              salePrice: 25000,
            },
          }),
          bandeja: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-008',
              name: 'Bandeja de Condensado',
              category: 'MATERIAL',
              stock: 10,
              minStock: 2,
              cost: 18000,
              salePrice: 32000,
            },
          }),
          kit: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-009',
              name: 'Kit de Instalación Split',
              category: 'MATERIAL',
              stock: 7,
              minStock: 3,
              cost: 55000,
              salePrice: 90000,
            },
          }),
          control: await tx.sparePart.create({
            data: {
              companyId: company.id,
              sku: 'DEMO-SKU-010',
              name: 'Control Remoto Universal',
              category: 'REPUESTO',
              stock: 9,
              minStock: 3,
              cost: 22000,
              salePrice: 38000,
            },
          }),
        };

        /** Registra el evento de creación, igual que hace el backend al crear una orden. */
        async function logOrderCreated(workOrderId: string) {
          await tx.activityLog.create({
            data: {
              companyId: company.id,
              workOrderId,
              userId: coordinator.id,
              userName: coordinator.name,
              action: ActivityAction.ORDER_CREATED,
              isFinancial: false,
            },
          });
        }

        // --- 7. Órdenes: 12, cubriendo todos los casos a probar ---

        // O1 — PENDING, con técnico, un equipo.
        const o1 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 1,
            clientId: client1.id,
            userId: technician.id,
            status: OrderStatus.PENDING,
            priority: Priority.MEDIUM,
            description: 'Revisión de nevera exhibidora por ruido inusual en el compresor.',
            equipmentLinks: {
              create: [{ equipmentId: eq.c1a.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o1.id);

        // O2 — IN_PROGRESS + varios equipos (2).
        const o2 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 2,
            clientId: client2.id,
            userId: technician.id,
            status: OrderStatus.IN_PROGRESS,
            priority: Priority.HIGH,
            description:
              'Mantenimiento correctivo de dos equipos de aire acondicionado en sede principal.',
            equipmentLinks: {
              create: [
                { equipmentId: eq.c2a.id, companyId: company.id },
                { equipmentId: eq.c2b.id, companyId: company.id },
              ],
            },
          },
        });
        await logOrderCreated(o2.id);

        // O3 — COMPLETED + abono parcial.
        const o3Billing = calcTotal(180000, 0, 20000, 0, 19);
        const o3 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 3,
            clientId: client3.id,
            userId: technician.id,
            status: OrderStatus.COMPLETED,
            priority: Priority.HIGH,
            description: 'Cambio de compresor y recarga de gas en cuarto frío.',
            laborAmount: 180000,
            additionalAmount: 20000,
            additionalDescription: 'Transporte del técnico',
            discountAmount: 0,
            taxRateApplied: 19,
            totalAmount: o3Billing.total,
            billedAt: daysAgo(10),
            paymentStatus: 'PARTIAL',
            equipmentLinks: {
              create: [{ equipmentId: eq.c3a.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o3.id);
        await tx.payment.create({
          data: {
            companyId: company.id,
            workOrderId: o3.id,
            amount: 100000,
            paidAt: daysAgo(5),
            method: PaymentMethod.TRANSFER,
            reference: 'DEMO-TRANSF-0001',
            registeredById: coordinator.id,
          },
        });

        // O4 — DELIVERED + pagada por completo + cuenta de cobro generada.
        const o4Billing = calcTotal(300000, 0, 0, 10000, 19);
        const o4CollectionNumber = COLLECTION_NUMBER_START + 1;
        const o4 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 4,
            clientId: client4.id,
            userId: technician.id,
            status: OrderStatus.DELIVERED,
            priority: Priority.MEDIUM,
            description: 'Instalación y puesta en marcha de horno industrial.',
            laborAmount: 300000,
            additionalAmount: 0,
            discountAmount: 10000,
            taxRateApplied: 19,
            totalAmount: o4Billing.total,
            billedAt: daysAgo(20),
            collectionNumber: o4CollectionNumber,
            collectionIssuedAt: daysAgo(18),
            paymentStatus: 'PAID',
            equipmentLinks: {
              create: [{ equipmentId: eq.c4a.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o4.id);
        await tx.payment.create({
          data: {
            companyId: company.id,
            workOrderId: o4.id,
            amount: o4Billing.total,
            paidAt: daysAgo(15),
            method: PaymentMethod.CASH,
            registeredById: coordinator.id,
          },
        });

        // O5 — CANCELLED.
        const o5 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 5,
            clientId: client1.id,
            userId: technician.id,
            status: OrderStatus.CANCELLED,
            priority: Priority.LOW,
            description:
              'Diagnóstico de lavadora — el cliente canceló el servicio antes de iniciar.',
            equipmentLinks: {
              create: [{ equipmentId: eq.c1b.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o5.id);

        // O6 — servicio locativo (sin equipos).
        const o6 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 6,
            clientId: client2.id,
            userId: technician.id,
            status: OrderStatus.IN_PROGRESS,
            priority: Priority.MEDIUM,
            description:
              'Revisión eléctrica locativa en sala de máquinas, sin equipo específico asociado.',
          },
        });
        await logOrderCreated(o6.id);

        // O7 — sin técnico asignado.
        const o7 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 7,
            clientId: client3.id,
            userId: null,
            status: OrderStatus.PENDING,
            priority: Priority.LOW,
            description: 'Solicitud de mantenimiento preventivo pendiente de asignar técnico.',
            equipmentLinks: {
              create: [{ equipmentId: eq.c3b.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o7.id);

        // O8 — con repuestos y fotos.
        const o8PartsTotal = 65000 + 25000; // válvula + capacitor (unitPrice)
        const o8Billing = calcTotal(90000, o8PartsTotal, 0, 0, 19);
        const o8 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 8,
            clientId: client4.id,
            userId: technician.id,
            status: OrderStatus.DELIVERED,
            priority: Priority.HIGH,
            description: 'Cambio de válvula de expansión y capacitor en split decorativo.',
            laborAmount: 90000,
            additionalAmount: 0,
            discountAmount: 0,
            taxRateApplied: 19,
            totalAmount: o8Billing.total,
            billedAt: daysAgo(8),
            paymentStatus: 'PENDING',
            equipmentLinks: {
              create: [{ equipmentId: eq.c4b.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o8.id);
        await tx.workOrderPart.create({
          data: {
            companyId: company.id,
            workOrderId: o8.id,
            sparePartId: parts.valvula.id,
            quantity: 1,
            unitCost: parts.valvula.cost,
            unitPrice: parts.valvula.salePrice,
          },
        });
        await tx.workOrderPart.create({
          data: {
            companyId: company.id,
            workOrderId: o8.id,
            sparePartId: parts.capacitor.id,
            quantity: 1,
            unitCost: parts.capacitor.cost,
            unitPrice: parts.capacitor.salePrice,
          },
        });
        await tx.attachment.create({
          data: {
            companyId: company.id,
            workOrderId: o8.id,
            uploadedById: technician.id,
            url: 'https://picsum.photos/seed/fixtrack-dev-o8-1/1200/900',
            publicId: 'fixtrack-dev-seed/o8-photo-1',
          },
        });
        await tx.attachment.create({
          data: {
            companyId: company.id,
            workOrderId: o8.id,
            uploadedById: technician.id,
            url: 'https://picsum.photos/seed/fixtrack-dev-o8-2/1200/900',
            publicId: 'fixtrack-dev-seed/o8-photo-2',
          },
        });

        // O9 — vencida hace más de 30 días (cliente con 0 días de crédito).
        const o9Billing = calcTotal(150000, 0, 0, 0, 19);
        const o9 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 9,
            clientId: client1.id,
            userId: technician.id,
            status: OrderStatus.DELIVERED,
            priority: Priority.MEDIUM,
            description: 'Mantenimiento correctivo de nevera exhibidora — cuenta vencida.',
            laborAmount: 150000,
            additionalAmount: 0,
            discountAmount: 0,
            taxRateApplied: 19,
            totalAmount: o9Billing.total,
            billedAt: daysAgo(40),
            paymentStatus: 'PENDING',
            equipmentLinks: {
              create: [{ equipmentId: eq.c1a.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o9.id);

        // O10 — cuenta de cobro generada + abono parcial.
        const o10Billing = calcTotal(200000, 0, 15000, 0, 19);
        const o10CollectionNumber = COLLECTION_NUMBER_START + 2;
        const o10 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 10,
            clientId: client2.id,
            userId: technician.id,
            status: OrderStatus.DELIVERED,
            priority: Priority.MEDIUM,
            description:
              'Mantenimiento de aire acondicionado — cuenta de cobro emitida, pago parcial.',
            laborAmount: 200000,
            additionalAmount: 15000,
            additionalDescription: 'Transporte',
            discountAmount: 0,
            taxRateApplied: 19,
            totalAmount: o10Billing.total,
            billedAt: daysAgo(12),
            collectionNumber: o10CollectionNumber,
            collectionIssuedAt: daysAgo(10),
            paymentStatus: 'PARTIAL',
            equipmentLinks: {
              create: [{ equipmentId: eq.c2a.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o10.id);
        await tx.payment.create({
          data: {
            companyId: company.id,
            workOrderId: o10.id,
            amount: 100000,
            paidAt: daysAgo(6),
            method: PaymentMethod.TRANSFER,
            reference: 'DEMO-TRANSF-0002',
            registeredById: coordinator.id,
          },
        });

        // O11 — relleno: IN_PROGRESS simple.
        const o11 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 11,
            clientId: client3.id,
            userId: technician.id,
            status: OrderStatus.IN_PROGRESS,
            priority: Priority.MEDIUM,
            description: 'Mantenimiento preventivo programado de cuarto frío.',
            equipmentLinks: {
              create: [{ equipmentId: eq.c3a.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o11.id);

        // O12 — relleno: PENDING simple.
        const o12 = await tx.workOrder.create({
          data: {
            companyId: company.id,
            orderNumber: ORDER_NUMBER_START + 12,
            clientId: client4.id,
            userId: technician.id,
            status: OrderStatus.PENDING,
            priority: Priority.LOW,
            description: 'Solicitud de revisión de split decorativo — pendiente de programar.',
            equipmentLinks: {
              create: [{ equipmentId: eq.c4b.id, companyId: company.id }],
            },
          },
        });
        await logOrderCreated(o12.id);

        // --- 8. Consecutivos de la empresa, listos para la siguiente orden real ---
        await tx.company.update({
          where: { id: company.id },
          data: {
            nextOrderNumber: ORDER_NUMBER_START + 13,
            nextCollectionNumber: COLLECTION_NUMBER_START + 3,
          },
        });
      },
      { timeout: 30_000 },
    );

    console.log('Seed de desarrollo completado.');
    console.log('');
    console.log(`Empresa: ${DEMO_COMPANY_NAME} (id=${DEMO_COMPANY_ID})`);
    console.log('Usuarios (contraseña común, ver README > Entornos):');
    console.log('  admin@example.com        (ADMIN)');
    console.log('  coordinador@example.com  (COORDINATOR)');
    console.log('  tecnico@example.com      (TECHNICIAN)');
    console.log(`  contraseña: ${DEV_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
