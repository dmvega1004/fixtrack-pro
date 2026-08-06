import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/api/users";
import { getWorkOrders } from "@/lib/api/work-orders";
import { HttpError } from "@/lib/api/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeAvatar } from "@/components/employee/employee-avatar";
import { RoleBadge } from "@/components/employee/role-badge";
import { EmployeeEditForm } from "@/components/employee/employee-edit-form";
import { ResetPasswordForm } from "@/components/employee/reset-password-form";
import { DeleteEmployeeButton } from "@/components/employee/delete-employee-button";
import { StatusChip } from "@/components/shared/status-chip";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatDate } from "@/lib/format/dates";

interface EmpleadoDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function EmpleadoDetallePage({ params }: EmpleadoDetallePageProps) {
  const { id } = await params;
  const session = await getSession();

  let employee;
  try {
    employee = await getUser(id);
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const isAdmin = session?.role === "ADMIN";
  const isSelf = session?.userId === employee.id;

  const assignedOrders =
    employee.role === "TECHNICIAN"
      ? (await getWorkOrders())
          .filter((order) => order.user?.id === employee.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <EmployeeAvatar name={employee.name} className="size-12 text-base" />
        <div>
          <h1 className="text-2xl font-semibold">{employee.name}</h1>
          <p className="text-sm text-muted-foreground">{employee.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del empleado</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Nombre" value={employee.name} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Rol
            </span>
            <RoleBadge role={employee.role} />
          </div>
          <Field label="Correo" value={employee.email} />
          <Field label="Ingreso" value={formatDate(employee.createdAt)} />
        </CardContent>
      </Card>

      {isAdmin ? (
        <>
          <EmployeeEditForm
            employeeId={employee.id}
            initialName={employee.name}
            initialRole={employee.role}
            isSelf={isSelf}
          />
          <ResetPasswordForm employeeId={employee.id} />
        </>
      ) : null}

      {employee.role === "TECHNICIAN" && (
        <Card>
          <CardHeader>
            <CardTitle>Órdenes asignadas</CardTitle>
          </CardHeader>
          <CardContent>
            {assignedOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este técnico no tiene órdenes asignadas.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {assignedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/ordenes/${order.id}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{formatOrderNumber(order.orderNumber)}</span>
                      <span className="text-xs text-muted-foreground">
                        {order.equipment
                          ? `${order.equipment.brand} ${order.equipment.model} · ${order.client.name}`
                          : `${order.client.name} · Servicio locativo`}
                      </span>
                    </div>
                    <span className="flex items-center gap-3">
                      <StatusChip status={order.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && !isSelf && (
        <div className="border-t border-border pt-4">
          <DeleteEmployeeButton employeeId={employee.id} employeeName={employee.name} />
        </div>
      )}
      {isAdmin && isSelf && (
        <p className="text-xs text-muted-foreground">
          No puedes eliminar tu propia cuenta. Pídeselo a otro administrador.
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm break-words">{value}</span>
    </div>
  );
}
