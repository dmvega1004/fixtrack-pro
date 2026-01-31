// src/routes/index.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import { MainLayout } from '@/components/layout/MainLayout'
import DashboardPage from '@/pages/DashboardPage'
import UsersPage from '@/pages/UsersPage'
import ClientsPage from '@/pages/ClientsPage'
import OrdenesPage from '@/pages/OrdenesPage'

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTAS PÚBLICAS */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

        {/* RUTAS PROTEGIDAS */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<MainLayout />}>
            {/* Redirección cuando entra directamente a /app */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* MÓDULOS FUNCIONALES */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="ordenes" element={<OrdenesPage />} />

            {/* MÓDULOS FUTUROS */}
            <Route path="inventario" element={<h2 className="p-8 text-2xl">Inventario (Próximamente)</h2>} />
            <Route path="configuracion" element={<h2 className="p-8 text-2xl">Configuración (Próximamente)</h2>} />

            {/* 404 dentro de /app */}
            <Route path="*" element={<h1 className="p-8 text-3xl font-bold text-destructive">404 - Página no encontrada</h1>} />
          </Route>
        </Route>

        {/* CATCH-ALL GLOBAL (fuera de /app) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}