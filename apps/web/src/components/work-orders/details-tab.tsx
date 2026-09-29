import type { WorkOrder } from "@/lib/api/work-orders";
import type { Technician, MyProfile } from "@/lib/api/users";
import { DescriptionEditor } from "./description-editor";
import { DiagnosisEditor } from "./diagnosis-editor";
import { AssistedDraftPanel } from "./assisted-draft-panel";
import { ObservationsEditor } from "./observations-editor";
import { SuggestionsEditor } from "./suggestions-editor";
import { ServiceLocationEditor } from "./service-location-editor";
import { ReassignTechnician } from "./reassign-technician";
import { PriorityEditor } from "./priority-editor";
import { ServiceTypeEditor } from "./service-type-editor";
import { QuoteLinkEditor } from "./quote-link-editor";
import { SignaturesSection } from "./signatures-section";
import { DeleteOrderButton } from "./delete-order-button";

interface DetailsTabProps {
  order: WorkOrder;
  userId: string;
  canManage: boolean;
  isAdmin: boolean;
  technicians: Technician[];
  isTerminal: boolean;
  myProfile: MyProfile;
}

export function DetailsTab({
  order,
  userId,
  canManage,
  isAdmin,
  technicians,
  isTerminal,
  myProfile,
}: DetailsTabProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DescriptionEditor
        orderId={order.id}
        userId={userId}
        initialDescription={order.description}
        isTerminal={isTerminal}
      />

      <AssistedDraftPanel
        orderId={order.id}
        isTerminal={isTerminal}
        currentValues={{
          diagnosis: order.diagnosis,
          observations: order.observations,
          suggestions: order.suggestions,
        }}
      />

      <DiagnosisEditor
        orderId={order.id}
        userId={userId}
        initialDiagnosis={order.diagnosis}
        isTerminal={isTerminal}
      />

      <ObservationsEditor
        orderId={order.id}
        userId={userId}
        initialObservations={order.observations}
        isTerminal={isTerminal}
      />

      <SuggestionsEditor
        orderId={order.id}
        userId={userId}
        initialSuggestions={order.suggestions}
        isTerminal={isTerminal}
      />

      <ServiceLocationEditor
        orderId={order.id}
        initialEndClientName={order.endClientName}
        initialServiceCity={order.serviceCity}
        initialServiceTime={order.serviceTime}
        initialServiceDate={order.serviceDate}
        isTerminal={isTerminal}
      />

      {/* Los tres roles: enlazar la cotización que se ejecuta es parte de
          documentar el trabajo (el selector no muestra montos). */}
      <QuoteLinkEditor
        orderId={order.id}
        clientId={order.client.id}
        currentQuote={order.quote ?? null}
        isTerminal={isTerminal}
      />

      <SignaturesSection
        orderId={order.id}
        order={order}
        myProfile={myProfile}
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
