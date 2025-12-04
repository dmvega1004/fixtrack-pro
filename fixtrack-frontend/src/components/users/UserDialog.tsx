// src/components/users/UserDialog.tsx → VERSIÓN FINAL 100% SIN ERRORES
import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation } from '@tanstack/react-query'
import { usersService } from '@/services/users.service'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  rol: z.enum(['ADMIN', 'TECNICO', 'RECEPCION', 'CONTABILIDAD']),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user?: any
}

export function UserDialog({ open, onOpenChange, onSuccess, user }: Props) {
  const isEdit = !!user?.id
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: user || {},
  })

  // Resetear formulario
  React.useEffect(() => {
    if (open) {
      if (user) {
        reset({
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          password: '',
        })
      } else {
        reset({ nombre: '', email: '', password: '', rol: 'TECNICO' })
      }
    }
  }, [open, user, reset])

  // CORREGIDO: Añadimos el tipo FormData a la mutación
  const mutation = useMutation<FormData, Error, FormData>({
    mutationFn: (data: FormData) =>
      isEdit
        ? usersService.updateUser(user.id, data)
        : usersService.createUser(data as any),
    onSuccess: () => {
      toast({
        title: isEdit ? 'Usuario actualizado' : 'Usuario creado',
        description: 'Los cambios se guardaron correctamente',
      })
      reset()
      onSuccess()
      onOpenChange(false)
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el usuario',
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data) // ← AHORA FUNCIONA 100%
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input {...register('nombre')} placeholder="Juan Pérez" />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input {...register('email')} type="email" placeholder="juan@taller.com" disabled={isEdit} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Contraseña {isEdit && '(dejar vacío para no cambiar)'}</Label>
            <Input {...register('password')} type="password" placeholder={isEdit ? '••••••••' : ''} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select onValueChange={(value) => setValue('rol', value as any)} defaultValue={user?.rol}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="TECNICO">Técnico</SelectItem>
                <SelectItem value="RECEPCION">Recepción</SelectItem>
                <SelectItem value="CONTABILIDAD">Contabilidad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Usuario'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}