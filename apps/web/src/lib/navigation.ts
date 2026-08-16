import type { Role } from "./api/auth";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Boxes,
  CalendarClock,
  Package,
  Wallet,
  UserCog,
  Building,
} from "lucide-react";

export interface NavSection {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const ALL_ROLES: Role[] = ["ADMIN", "COORDINATOR", "TECHNICIAN"];

export const NAV_SECTIONS: NavSection[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { href: "/ordenes", label: "Órdenes", icon: ClipboardList, roles: ALL_ROLES },
  { href: "/clientes", label: "Clientes", icon: Users, roles: ALL_ROLES },
  { href: "/equipos", label: "Equipos", icon: Boxes, roles: ALL_ROLES },
  {
    href: "/mantenimiento",
    label: "Mantenimiento",
    icon: CalendarClock,
    roles: ["ADMIN", "COORDINATOR"],
  },
  { href: "/inventario", label: "Inventario", icon: Package, roles: ALL_ROLES },
  {
    href: "/cobros",
    label: "Cobros",
    icon: Wallet,
    roles: ["ADMIN"],
  },
  {
    href: "/personal",
    label: "Personal",
    icon: UserCog,
    roles: ["ADMIN", "COORDINATOR"],
  },
  {
    href: "/empresa",
    label: "Mi empresa",
    icon: Building,
    roles: ["ADMIN"],
  },
];

export function getNavSectionsForRole(role: Role): NavSection[] {
  return NAV_SECTIONS.filter((section) => section.roles.includes(role));
}
