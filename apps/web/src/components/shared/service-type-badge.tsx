import { cn } from "@/lib/utils";

// Debe reflejar exactamente el enum ServiceType de packages/database/prisma/schema.prisma
export type ServiceType = "CORRECTIVE" | "PREVENTIVE" | "INSPECTION" | "INSTALLATION";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  CORRECTIVE: "Correctivo",
  PREVENTIVE: "Preventivo",
  INSPECTION: "Inspección",
  INSTALLATION: "Instalación",
};

export const SERVICE_TYPE_STYLES: Record<ServiceType, string> = {
  CORRECTIVE: "bg-neutral-100 text-neutral-800",
  PREVENTIVE: "bg-teal-100 text-teal-800",
  INSPECTION: "bg-violet-100 text-violet-800",
  INSTALLATION: "bg-blue-100 text-blue-800",
};

interface ServiceTypeBadgeProps {
  serviceType: ServiceType;
}

export function ServiceTypeBadge({ serviceType }: ServiceTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        SERVICE_TYPE_STYLES[serviceType],
      )}
    >
      {SERVICE_TYPE_LABELS[serviceType]}
    </span>
  );
}
