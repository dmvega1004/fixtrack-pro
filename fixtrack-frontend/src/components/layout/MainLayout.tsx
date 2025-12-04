// src/components/layout/MainLayout.tsx (VERSIÓN CORREGIDA Y SIMPLIFICADA)

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, Search, UserCircle } from 'lucide-react'; 
import { Input } from '@/components/ui/input';

export const MainLayout = () => {
  return (
    // 1. Contenedor principal: Activa el Flexbox y la altura completa
    <div className="flex min-h-screen w-full bg-muted/30 font-sans text-foreground">
      
      {/* 🔹 Sidebar Fijo */}
      {/* La clase md:flex asegura que el sidebar sea visible en desktop y define su ancho fijo (w-64) */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        <Sidebar />
      </aside>

      {/* 🔹 Área de Contenido Principal */}
      {/* 2. CLAVE: md:pl-64 empuja el contenido para dejar espacio al Sidebar fijo */}
      <div className="flex flex-col flex-1 md:pl-64 transition-all duration-300">
        
        {/* 🔸 Topbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40 shadow-sm">
          
          <div className="w-full max-w-md hidden md:flex items-center relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar órdenes..." 
              className="pl-10 bg-muted/50 border-transparent focus:bg-background transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary">
              <Bell className="w-5 h-5" />
            </button>
            
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                <UserCircle className="w-6 h-6" />
            </div>
          </div>
        </header>

        {/* 🔸 Contenido Dinámico (Las Páginas) */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};