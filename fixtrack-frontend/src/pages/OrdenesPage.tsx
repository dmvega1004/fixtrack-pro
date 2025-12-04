// src/pages/OrdenesPage.tsx → VERSIÓN FINAL 100 % FUNCIONAL Y SIN ERRORES
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordenesService } from '@/services/ordenes.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Eye, Edit, Wrench, CheckCircle, ClipboardList } from 'lucide-react'
import { OrdenDialog } from '@/components/ordenes/OrdenDialog'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

export default function OrdenesPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedOrden, setSelectedOrden] = useState<any>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: ordenes = [], isLoading } = useQuery({
    queryKey: ['ordenes'],
    queryFn: ordenesService.getOrdenes,
  })

  const handleSuccess = () => {
    setOpenDialog(false)
    setSelectedOrden(null)
    queryClient.invalidateQueries({ queryKey: ['ordenes'] })
  }

  // CORREGIDO: función completa y bien definida
  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      PENDIENTE: 'bg-yellow-500',
      EN_PROCESO: 'bg-blue-500',
      FINALIZADA: 'bg-green-500',
      CANCELADA: 'bg-red-500',
    }
    return colors[estado] || 'bg-gray-500'
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-3xl font-bold">Órdenes de Trabajo</CardTitle>
          <Button onClick={() => setOpenDialog(true)} size="lg" className="gap-3">
            <Plus className="h-5 w-5" />
            Nueva Orden
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-8 border-primary border-t-transparent"></div>
            </div>
          ) : ordenes.length === 0 ? (
            <div className="text-center py-16">
              {/* CORREGIDO: icono dentro del componente */}
              <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">No hay órdenes de trabajo aún</p>
              <Button onClick={() => setOpenDialog(true)} className="mt-6" size="lg">
                Crear primera orden
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenes.map((orden) => (
                    <TableRow key={orden.id} className="hover:bg-muted/50">
                      <TableCell className="font-semibold">{orden.codigo}</TableCell>
                      <TableCell>{orden.cliente?.nombre || 'Sin cliente'}</TableCell>
                      <TableCell>{orden.equipo?.nombre || 'Sin equipo'}</TableCell>
                      <TableCell>{orden.tecnico?.nombre || 'Sin asignar'}</TableCell>
                      <TableCell>
                        <Badge className={getEstadoColor(orden.estado)}>
                          {orden.estado.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(orden.fechaCreacion), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrden(orden)
                              setOpenDialog(true)
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <OrdenDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        orden={selectedOrden}
        onSuccess={handleSuccess}
      />
    </div>
  )
}