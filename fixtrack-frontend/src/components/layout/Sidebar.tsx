// src/components/layout/Sidebar.tsx  (o donde lo tengas)
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Settings, Package, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';

const navItems = [
  { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Órdenes de Trabajo', path: '/app/ordenes', icon: ClipboardList },
  { name: 'Clientes', path: '/app/clientes', icon: Users }, // Usa el icono Users, Briefcase, o el que prefieras
  { name: 'Inventario', path: '/app/inventario', icon: Package },
  { name: 'Usuarios', path: '/app/usuarios', icon: Users },
  { name: 'Configuración', path: '/app/configuracion', icon: Settings },
];

export const Sidebar = () => {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-screen flex-col bg-card border-r border-border shadow-sm">
      {/* Header del Sidebar */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            FixTrack<span className="text-primary">Pro</span>
          </span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Menú Principal
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start mb-1 transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 mr-3", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Logout REAL y bonito */}
      <div className="p-4 border-t border-border bg-muted/30">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all group"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
          <span className="font-medium">Cerrar Sesión</span>
        </Button>
      </div>
    </div>
  );
};