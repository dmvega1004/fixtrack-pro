// src/components/ordenes/OrdenDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ordenesService } from '@/services/ordenes.service'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Cliente } from '@/services/ordenes.service'
import { useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { Wrench, Trash2, Plus } from 'lucide-react'

const schema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio'),
  clienteId: z.coerce.number().min(1, "Selecciona un cliente"),
  tituloOrden: z.string().min(1, 'El título es obligatorio'),
  descripcionProblema: z.string().min(1, 'La descripción es obligatoria'),
  diagnosticoTecnico: z.string().optional().nullable(),
  trabajoRealizado: z.string().optional().nullable(),
  horasManoObra: z.coerce.number().optional().default(0),
  costoManoObra: z.coerce.number().optional().default(50),
  prioridad: z.string().optional().default('MEDIA'),
  estado: z.string().optional().default('PENDIENTE'),
  repuestosUsados: z.array(z.any()).optional().default([]),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  orden?: any
  onSuccess: () => void
}

export function OrdenDialog({ open, onOpenChange, orden, onSuccess }: Props) {
  const isEdit = !!orden?.id
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('step1')
  const [nuevoRepuesto, setNuevoRepuesto] = useState({ nombre: '', cantidad: 1, costo: 0 });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any, 
    defaultValues: orden || { 
      prioridad: 'MEDIA', 
      estado: 'PENDIENTE', 
      repuestosUsados: [],
      horasManoObra: 0,
      costoManoObra: 50
    },
  })

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['clientes'],
    queryFn: () => ordenesService.getClientes(),
  })

  const handleAddRepuesto = () => {
    if (!nuevoRepuesto.nombre) return;
    const actuales = watch('repuestosUsados') || [];
    setValue('repuestosUsados', [...actuales, { ...nuevoRepuesto }]);
    setNuevoRepuesto({ nombre: '', cantidad: 1, costo: 0 });
  };

  const handleRemoveRepuesto = (index: number) => {
    const actuales = watch('repuestosUsados') || [];
    setValue('repuestosUsados', actuales.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
  mutationFn: async (data: FormData) => {
    const payload = {
      ...data,
      // Llenamos ambos para que no falte nada en la DB
      tituloProblema: data.tituloOrden, 
      titulo: data.tituloOrden,
      descripcionProblema: data.descripcionProblema,
      descripcion: data.descripcionProblema,
      // Campos obligatorios según tu enum
      tipo: 'CORRECTIVO', 
    };

    // Eliminamos los nombres temporales del formulario antes de enviar
    delete (payload as any).tituloOrden;

    if (isEdit) {
      return await ordenesService.updateOrden(orden.id, payload as any);
    } else {
      return await ordenesService.createOrden(payload as any);
    }
  },
  // ... onSuccess y onError igual
    onSuccess: () => {
      toast({ title: '¡Éxito!', description: 'Orden guardada correctamente.' });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error completo del servidor:", error.response?.data);
      toast({ 
        title: 'Error de servidor', 
        description: error.response?.data?.error || 'Revisa la consola para más detalles', 
        variant: 'destructive' 
      });
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Orden' : 'Nueva Orden'}</DialogTitle>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit((data) => {
            console.log("Datos del formulario antes del mapeo:", data);
            mutation.mutate(data);
          })} 
          className="space-y-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="step1">1. Información</TabsTrigger>
              <TabsTrigger value="step2">2. Técnico</TabsTrigger>
              <TabsTrigger value="step3">3. Finalizar</TabsTrigger>
            </TabsList>

            <TabsContent value="step1" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input {...register('codigo')} placeholder="OR-001" />
                  {errors.codigo && <p className="text-xs text-red-500">{errors.codigo.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select 
                    value={watch('clienteId')?.toString()} 
                    onValueChange={(v) => setValue('clienteId', Number(v))}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Título / Equipo</Label>
                <Input {...register('tituloOrden')} placeholder="Ej. Portón Principal" />
              </div>
              <div className="space-y-2">
                <Label>Descripción del Problema</Label>
                <Textarea {...register('descripcionProblema')} className="h-24" />
              </div>
            </TabsContent>

            <TabsContent value="step2" className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Diagnóstico Técnico</Label>
                  <Textarea {...register("diagnosticoTecnico")} className="h-32 resize-none" />
                </div>
                <div className="space-y-2">
                  <Label>Trabajo Realizado</Label>
                  <Textarea {...register("trabajoRealizado")} className="h-32 resize-none" />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 border rounded-md p-4 bg-slate-50">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> Repuestos
                </h4>
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><Input placeholder="Nombre" value={nuevoRepuesto.nombre} onChange={(e) => setNuevoRepuesto({...nuevoRepuesto, nombre: e.target.value})} /></div>
                  <div className="w-20"><Input type="number" value={nuevoRepuesto.cantidad} onChange={(e) => setNuevoRepuesto({...nuevoRepuesto, cantidad: Number(e.target.value)})} /></div>
                  <div className="w-24"><Input type="number" value={nuevoRepuesto.costo} onChange={(e) => setNuevoRepuesto({...nuevoRepuesto, costo: Number(e.target.value)})} /></div>
                  <Button type="button" variant="secondary" onClick={handleAddRepuesto}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-2 mt-2">
                  {watch('repuestosUsados')?.map((rep, index) => (
                    <div key={index} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                      <span>{rep.cantidad}x {rep.nombre}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">${(rep.cantidad * rep.costo).toFixed(2)}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveRepuesto(index)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step3" className="space-y-4 py-4">
              <div className="max-w-xs mx-auto space-y-4">
                <Label>Estado Final</Label>
                <Select value={watch('estado')} onValueChange={(v) => setValue('estado', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                    <SelectItem value="TERMINADO">Terminado</SelectItem>
                    <SelectItem value="ENTREGADO">Entregado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar Orden'} 
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}