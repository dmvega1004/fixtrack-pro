import Link from "next/link";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/lib/api/auth";

interface EmployeeFilterChipsProps {
  currentRole?: Role;
}

function chipClasses(active: boolean): string {
  return cn(
    "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground hover:text-foreground",
  );
}

export function EmployeeFilterChips({ currentRole }: EmployeeFilterChipsProps) {
  function hrefFor(role?: Role): string {
    return role ? `/personal?role=${role}` : "/personal";
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={hrefFor(undefined)} className={chipClasses(!currentRole)}>
        Todos
      </Link>
      {ROLES.map((role) => (
        <Link key={role} href={hrefFor(role)} className={chipClasses(currentRole === role)}>
          {ROLE_LABELS[role]}
        </Link>
      ))}
    </div>
  );
}
