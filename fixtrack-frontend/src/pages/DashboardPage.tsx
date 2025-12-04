// src/pages/DashboardPage.tsx → VERSIÓN FINAL DEFINITIVA 10/10
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  ClipboardList, 
  Wrench, 
  Users, 
  AlertTriangle, 
  UserCheck, 
  XCircle, 
  RefreshCw, 
  Loader2 
} from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

interface DashboardData {
  ordenesAbiertas: number
  equiposEnTaller: number
  clientesActivos: number
  repuestosCriticos: number
  tecnicosDisponibles: { id: number; nombre: string }[]
}

const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await api.get('/dashboard/resumen')
    if (response.data?.success) {
      return response.data.data
    }
    throw new Error('Respuesta inválida del servidor')
  } catch (error: any) {
    console.error('Error dashboard:', error)
    throw error
  }
}

export default function DashboardPage() {
  const { 
    data, 
    isLoading, 
    isError, 
    error,
    refetch, 
    isFetching 
  } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: fetchDashboardData,
    initialData: { 
      ordenesAbiertas: 0, 
      equiposEnTaller: 0, 
      clientesActivos: 0, 
      repuestosCriticos: 0, 
      tecnicosDisponibles: [] 
    },
    refetchOnWindowFocus: false,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Cargando panel de control...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto py-24 text-center">
        <XCircle className="h-16 w-16 text-destructive mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-destructive mb-2">Error al cargar el Dashboard</h2>
        <p className="text-muted-foreground mb-6">
          {(error as Error)?.message || 'No se pudo conectar con el servidor'}
        </p>
        <Button onClick={() => refetch()} size="lg" className="gap-3">
          <RefreshCw className={cn("h-5 w-5", isFetching && "animate-spin")} />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Panel de Control</h1>
          <p className="text-muted-foreground mt-2">Resumen en tiempo real del taller</p>
        </div>
        <Button 
          onClick={() => refetch()} 
          variant="outline" 
          size="lg" 
          disabled={isFetching}
          className="gap-3"
        >
          <RefreshCw className={cn("h-5 w-5", isFetching && "animate-spin")} />
          {isFetching ? "Actualizando..." : "Actualizar datos"}
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Órdenes Abiertas</CardTitle>
            <ClipboardList className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{data.ordenesAbiertas}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendientes de atención</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Equipos en Taller</CardTitle>
            <Wrench className="h-6 w-6 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{data.equiposEnTaller}</div>
            <p className="text-xs text-muted-foreground mt-1">En proceso de reparación</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Activos</CardTitle>
            <Users className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{data.clientesActivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Este mes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Repuestos Críticos</CardTitle>
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">{data.repuestosCriticos}</div>
            <p className="text-xs text-muted-foreground mt-1">¡Stock bajo - Urgente!</p>
          </CardContent>
        </Card>
      </div>

      {/* Técnicos Disponibles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Próximamente: timeline de órdenes y gráficos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <UserCheck className="h-6 w-6 text-green-500" />
              Técnicos Disponibles
            </CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {data.tecnicosDisponibles.length} online
            </Badge>
          </CardHeader>
          <CardContent>
            {data.tecnicosDisponibles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay técnicos registrados</p>
            ) : (
              <div className="space-y-4">
                {data.tecnicosDisponibles.map((tecnico) => (
                  <div key={tecnico.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-green-500 text-white text-lg font-semibold">
                        {tecnico.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{tecnico.nombre}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        Disponible
                      </Badge>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}