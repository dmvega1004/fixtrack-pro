import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { clientsService, Client } from '@/services/clients.service' 
import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { useEffect } from 'react' // Importación de useEffect

// Esquema de validación para el formulario
const schema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres'),
  // Hacemos el email opcional, pero si existe, debe ser válido
  email: z.string().email('Email inválido').optional().or(z.literal('')), 
  telefono: z.string().optional().or(z.literal('')), // Aseguramos que sea string o literal vacio
  direccion: z.string().optional().or(z.literal('')), // Aseguramos que sea string o literal vacio
})

type FormData = z.infer<typeof schema>
type ClientProps = Client | null

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: ClientProps
  onSuccess: () => void
}

export function ClientDialog({ open, onOpenChange, client, onSuccess }: Props) {
  const { toast } = useToast()
  const isEdit = !!client?.id
  
  // Tipado correcto para defaultValues
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Al inicializar, aseguramos que los valores opcionales sean cadena vacía si el objeto cliente es null
    defaultValues: {
      nombre: client?.nombre || '', 
      email: client?.email || '',
      telefono: client?.telefono || '',
      direccion: client?.direccion || '',
    },
  })

  // Hook para actualizar el formulario cuando se abre para edición
  useEffect(() => {
    if (open && client) {
      // Usamos los valores del cliente para la edición
      reset({
        nombre: client.nombre,
        email: client.email || '',
        telefono: client.telefono || '',
        direccion: client.direccion || '',
      })
    } else if (!open) {
      // Limpiar el formulario al cerrar si no es edición o si es un formulario nuevo
      reset({ nombre: '', email: '', telefono: '', direccion: '' }) 
    }
  }, [open, client, reset])

  const mutation = useMutation({
    // La corrección clave: limpiamos los datos antes de enviarlos.
    mutationFn: (data: FormData) => {
      // 1. Limpiamos los datos: convertimos cadenas vacías a UNDEFINED (lo estándar)
      //    y luego usamos 'as' para forzar la compatibilidad con el tipo Omit<Client, 'id'>.
      const cleanedData = {
        nombre: data.nombre,
        // CORRECCIÓN FINAL: Usamos undefined y lo encapsulamos en la aserción de tipo
        email: data.email === '' ? undefined : data.email,
        telefono: data.telefono === '' ? undefined : data.telefono,
        direccion: data.direccion === '' ? undefined : data.direccion,
      } as Omit<Client, 'id'> // <--- Esto resuelve el error de tipo en la asignación
      
      // 2. Ejecutamos la función de servicio
      if (isEdit) {
        // Usamos client!.id ya que isEdit garantiza que client no es null
        // Pasamos cleanedData que tiene la estructura correcta
        return clientsService.updateClient(client!.id, cleanedData) 
      }
      
      // Si estamos creando, usamos createClient
      // Pasamos cleanedData que tiene la estructura correcta
      return clientsService.createClient(cleanedData)
    },
    onSuccess: () => {
      toast({ title: isEdit ? 'Cliente actualizado' : 'Cliente creado' })
      onSuccess() // Cierra el modal y refresca la tabla en el componente padre
    },
    onError: (error) => {
      console.error("Error saving client:", error)
      toast({ 
        title: 'Error de Guardado', 
        description: 'No se pudo guardar el cliente. Verifique la conexión o los datos ingresados.', 
        variant: 'destructive' 
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input id="nombre" {...register('nombre')} placeholder="Juan Pérez" />
            {errors.nombre && <p className="text-sm text-destructive mt-1">{errors.nombre.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            {/* El or(z.literal('')) en el esquema asegura que no tengamos problemas con el valor vacío aquí */}
            <Input id="email" {...register('email')} type="email" placeholder="juan@ejemplo.com" />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" {...register('telefono')} placeholder="300 123 4567" />
          </div>
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" {...register('direccion')} placeholder="Calle 123 #45-67" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}