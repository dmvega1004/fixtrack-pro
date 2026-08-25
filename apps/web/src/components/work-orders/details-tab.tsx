import type { WorkOrder } from "@/lib/api/work-orders";
import type { Technician } from "@/lib/api/users";
import { DiagnosisEditor } from "./diagnosis-editor";
import { ObservationsEditor } from "./observations-editor";
import { ReassignTechnician } from "./reassign-technician";
import { PriorityEditor } from "./priority-editor";
import { ServiceTypeEditor } from "./service-type-editor";
import { DeleteOrderButton } from "./delete-order-button";

interface DetailsTabProps {
  order: WorkOrder;
  canManage: boolean;
  isAdmin: boolean;
  technicians: Technician[];
  isTerminal: boolean;
}

export function DetailsTab({
  order,
  canManage,
  isAdmin,
  technicians,
  isTerminal,
}: DetailsTabProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">Descripción completa</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {order.description}
        </p>
      </div>

      <DiagnosisEditor
        orderId={order.id}
        initialDiagnosis={order.diagnosis}
        isTerminal={isTerminal}
      />

      <ObservationsEditor
        orderId={order.id}
        initialObservations={order.observations}
        isTerminal={isTerminal}
      />

      {canManage && (
        <>
          <ReassignTechnician
            orderId={order.id}
            technicians={technicians}
            currentUserId={order.userId}
            isTerminal={isTerminal}
          />
          <PriorityEditor
            orderId={order.id}
            currentPriority={order.priority}
            isTerminal={isTerminal}
          />
          <ServiceTypeEditor
            orderId={order.id}
            currentServiceType={order.serviceType}
            isTerminal={isTerminal}
          />
        </>
      )}

      {isAdmin && (
        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-sm font-medium">Zona de riesgo</h2>
          <DeleteOrderButton
            orderId={order.id}
            orderNumber={order.orderNumber}
            collectionNumber={order.collectionNumber}
          />
        </div>
      )}
    </div>
  );
}
