"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Boxes, QrCode, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavSectionsForRole } from "@/lib/navigation";
import { ROLE_LABELS, type Session } from "@/lib/roles";
import { LogoutButton } from "@/components/shared/logout-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const SWIPE_CLOSE_THRESHOLD_PX = 60;

interface AppShellProps {
  session: Session;
  children: ReactNode;
}

interface MobileNavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const MOBILE_NAV_LEFT: MobileNavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/ordenes", label: "Órdenes", icon: ClipboardList },
];

const MOBILE_NAV_RIGHT: MobileNavItem[] = [{ href: "/equipos", label: "Equipos", icon: Boxes }];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0] ?? "").slice(0, 2).toUpperCase();
}

export function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();
  const navSections = getNavSectionsForRole(session.role);
  const [menuOpen, setMenuOpen] = useState(false);
  const swipeStartY = useRef<number | null>(null);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function handleDragHandleTouchStart(event: TouchEvent) {
    swipeStartY.current = event.touches[0]?.clientY ?? null;
  }

  function handleDragHandleTouchEnd(event: TouchEvent) {
    if (swipeStartY.current === null) return;
    const deltaY = (event.changedTouches[0]?.clientY ?? 0) - swipeStartY.current;
    swipeStartY.current = null;
    if (deltaY > SWIPE_CLOSE_THRESHOLD_PX) setMenuOpen(false);
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col md:flex-row">
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0 md:flex-col md:border-r md:border-border md:bg-card">
        <div className="flex items-center px-5 py-5">
          <Image
            src="/brand/logo-sm.png"
            alt="FixTrack Pro"
            width={140}
            height={32}
            unoptimized
          />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navSections.map((section) => {
            const active = isActive(section.href);
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {section.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t border-border px-4 py-4">
          <div className="flex items-center gap-3 pb-3">
            <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {getInitials(session.name)}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{session.name}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[session.role]}
              </span>
            </div>
          </div>
          <ProfileNavLink active={isActive("/perfil")} />
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card md:hidden">
        {MOBILE_NAV_LEFT.map((item) => (
          <MobileNavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <Link
          href="/escanear"
          aria-label="Escanear código QR"
          className="relative -top-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <QrCode className="size-6" />
        </Link>

        {MOBILE_NAV_RIGHT.map((item) => (
          <MobileNavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
          className="flex min-h-12 flex-1 flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground"
        >
          <Menu className="size-5" />
          Menú
        </button>
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85svh] overflow-y-auto p-0 pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <div
            onTouchStart={handleDragHandleTouchStart}
            onTouchEnd={handleDragHandleTouchEnd}
            className="flex items-center justify-center py-3"
          >
            <div className="h-1.5 w-10 rounded-full bg-muted" />
          </div>

          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 px-3">
            {navSections.map((section) => {
              const active = isActive(section.href);
              const Icon = section.icon;
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-5" />
                  {section.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-2 flex items-center gap-3 border-t border-border px-4 py-4">
            <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {getInitials(session.name)}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">{session.name}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[session.role]}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 px-4 pb-4">
            <ProfileNavLink
              active={isActive("/perfil")}
              onClick={() => setMenuOpen(false)}
            />
            <LogoutButton />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * Enlace a /perfil — compartido entre la barra lateral de escritorio y el
 * menú desplegable de móvil, para que ambos queden siempre en sincro (un
 * solo lugar donde ícono, estilo y estado activo pueden desincronizarse).
 * `onClick` es opcional: solo el menú móvil lo usa, para cerrar el Sheet.
 */
function ProfileNavLink({
  active,
  onClick,
}: {
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/perfil"
      onClick={onClick}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
      )}
    >
      <User className="size-5" />
      Perfil
    </Link>
  );
}

function MobileNavLink({
  item,
  active,
}: {
  item: MobileNavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 text-xs font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}
