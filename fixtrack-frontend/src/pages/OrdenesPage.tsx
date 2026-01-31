// src/pages/OrdenesPage.tsx
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  MoreHorizontal, 
  Plus, 
  Eye, 
  Edit, 
  ClipboardList, 
  FileText, 
  Trash2 
} from 'lucide-react'

// Imports de Servicios
import { ordenesService, generateInvoice } from '@/services/ordenes.service'

// Imports de Componentes UI
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { OrdenDialog } from '@/components/ordenes/OrdenDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function OrdenesPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedOrden, setSelectedOrden] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Consulta de datos al Backend
  const { data: ordenes = [], isLoading, isError } = useQuery({
    queryKey: ['ordenes'],
    queryFn: ordenesService.getOrdenes,
  })

  // Manejador: Al guardar/editar con éxito
  const handleSuccess = () => {
    setOpenDialog(false)
    setSelectedOrden(null)
    queryClient.invalidateQueries({ queryKey: ['ordenes'] })
    toast({ title: 'Operación exitosa', description: 'La lista de órdenes se ha actualizado.' })
  }

  // Manejador: Descargar Factura PDF
  const handleDownloadInvoice = async (orden: any) => {
    const id = orden?.id
    if (!id) return

    toast({ title: 'Generando factura...', description: `Procesando orden #${orden.codigo || id}` })
    
    try {
      await generateInvoice(id)
      toast({ title: 'Éxito', description: 'La descarga ha comenzado.', variant: 'default' })
    } catch (error) {
      console.error('Error descargando factura:', error)
      toast({ 
        title: 'Error', 
        description: 'No se pudo generar el PDF. Verifique que la orden tenga datos válidos.', 
        variant: 'destructive' 
      })
    }
  }

  // Manejador: Eliminar Orden (NUEVO)
  const handleDelete = async (orden: any) => {
    const id = orden?.id;
    if (!id) return;

    // Confirmación simple
    const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar la orden ${orden.codigo || id}? Esta acción no se puede deshacer.`);
    
    if (confirmacion) {
      try {
        await ordenesService.deleteOrden(id); // Asegúrate de haber agregado deleteOrden en tu servicio
        
        toast({ 
          title: 'Orden eliminada', 
          description: 'La orden ha sido eliminada correctamente.',
          variant: 'default'
        });
        
        // Recargar la lista
        queryClient.invalidateQueries({ queryKey: ['ordenes'] });
      } catch (error) {
        console.error('Error eliminando:', error);
        toast({ 
          title: 'Error', 
          description: 'No se pudo eliminar la orden. Verifique permisos o conexión.', 
          variant: 'destructive' 
        });
      }
    }
  }

  // Utilidad para colores de estado
  const getEstadoColor = (estado: string) => {
    if (!estado) return 'bg-gray-500'
    
    const colors: Record<string, string> = {
      PENDIENTE: 'bg-yellow-500',
      EN_PROCESO: 'bg-blue-500',
      TERMINADO: 'bg-green-600',
      ENTREGADO: 'bg-purple-500',
      CANCELADA: 'bg-red-500',
    }
    return colors[estado] || 'bg-gray-500'
  }

  // --- Renderizado de Errores ---
  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-xl text-red-500 font-semibold">Error al cargar datos</p>
        <p className="text-muted-foreground">No se pudieron obtener las órdenes del servidor.</p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['ordenes'] })}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  // --- Renderizado Principal ---
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-3xl font-bold">
            Órdenes de Trabajo
          </CardTitle>
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
              <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">No hay órdenes de trabajo aún</p>
              <Button onClick={() => setOpenDialog(true)} className="mt-6" size="lg">
                Crear primera orden
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border shadow-sm">
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
                  {ordenes.map((orden: any) => (
                    <TableRow key={orden.id} className="hover:bg-muted/50">
                      
                      {/* CÓDIGO */}
                      <TableCell className="font-semibold">
                        {orden.codigo || <span className="text-gray-400 italic">--</span>}
                      </TableCell>
                      
                      {/* CLIENTE */}
                      <TableCell>
                        {orden.cliente?.nombre || <span className="text-gray-400">Sin cliente</span>}
                      </TableCell>
                      
                      {/* EQUIPO */}
                      <TableCell>
                        {orden.equipo?.nombre || <span className="text-gray-400">General</span>}
                      </TableCell>
                      
                      {/* TÉCNICO */}
                      <TableCell>
                        {orden.tecnico?.nombre || <span className="text-orange-300 text-xs font-bold px-2 py-1 rounded bg-orange-50">SIN ASIGNAR</span>}
                      </TableCell>
                      
                      {/* ESTADO */}
                      <TableCell>
                        <Badge className={getEstadoColor(orden.estado)}>
                          {orden.estado ? orden.estado.replace('_', ' ') : 'N/A'}
                        </Badge>
                      </TableCell>
                      
                      {/* FECHA */}
                      <TableCell>
                        {(() => {
                          if (!orden.fechaCreacion) return <span className="text-gray-400 text-xs">Sin fecha</span>;
                          const fecha = new Date(orden.fechaCreacion);
                          return isValid(fecha) 
                            ? format(fecha, 'dd MMM yyyy', { locale: es }) 
                            : <span className="text-red-300 text-xs">Fecha inválida</span>;
                        })()}
                      </TableCell>

                      {/* ACCIONES */}
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
                            
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrden(orden);
                                setOpenDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => handleDownloadInvoice(orden)}>
                              <FileText className="w-4 h-4 mr-2 text-blue-600" />
                              Generar Factura PDF
                            </DropdownMenuItem>

                            {/* SECCIÓN DE PELIGRO: ELIMINAR */}
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => handleDelete(orden)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer font-medium"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
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