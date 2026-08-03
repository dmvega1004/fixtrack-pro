import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/lib/api/auth";

export const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  COORDINATOR: "bg-blue-100 text-blue-800",
  TECHNICIAN: "bg-teal-100 text-teal-800",
};

interface RoleBadgeProps {
  role: Role;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        ROLE_STYLES[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
