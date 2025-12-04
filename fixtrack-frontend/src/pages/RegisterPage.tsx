// src/pages/RegisterPage.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, User, Mail, Lock, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  nombreEmpresa: z.string().min(3, 'Nombre de empresa muy corto'),
  nitEmpresa: z.string().optional(),
  nombreAdmin: z.string().min(3, 'Tu nombre es requerido'),
  emailAdmin: z.string().email('Email inválido'),
  passwordAdmin: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const response = await api.post('/auth/register', data)

      if (response.data.success) {
        // Login automático
        const { token, usuario } = response.data.data
        localStorage.setItem('token', token)
        login(usuario.email, data.passwordAdmin) // opcional, solo para zustand

        // Redirigir al dashboard
        navigate('/app/dashboard')
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al registrar la empresa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-8 pt-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Building2 className="h-16 w-16 text-primary" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            FixTrack Pro
          </CardTitle>
          <CardDescription className="text-lg mt-4">
            Crea tu cuenta y empieza a gestionar tu taller en minutos
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombreEmpresa" className="text-base">
                  <Building2 className="inline-block w-4 h-4 mr-2" />
                  Nombre de la Empresa
                </Label>
                <Input
                  id="nombreEmpresa"
                  placeholder="Reparaciones Pérez"
                  {...register('nombreEmpresa')}
                  className="h-12 text-lg"
                />
                {errors.nombreEmpresa && (
                  <p className="text-sm text-destructive">{errors.nombreEmpresa.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nitEmpresa" className="text-base">
                  NIT (opcional)
                </Label>
                <Input
                  id="nitEmpresa"
                  placeholder="900123456-7"
                  {...register('nitEmpresa')}
                  className="h-12 text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombreAdmin" className="text-base">
                <User className="inline-block w-4 h-4 mr-2" />
                Tu Nombre Completo
              </Label>
              <Input
                id="nombreAdmin"
                placeholder="Juan Pérez"
                {...register('nombreAdmin')}
                className="h-12 text-lg"
              />
              {errors.nombreAdmin && (
                <p className="text-sm text-destructive">{errors.nombreAdmin.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailAdmin" className="text-base">
                <Mail className="inline-block w-4 h-4 mr-2" />
                Email del Administrador
              </Label>
              <Input
                id="emailAdmin"
                type="email"
                placeholder="admin@reparacionesperez.com"
                {...register('emailAdmin')}
                className="h-12 text-lg"
              />
              {errors.emailAdmin && (
                <p className="text-sm text-destructive">{errors.emailAdmin.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordAdmin" className="text-base">
                <Lock className="inline-block w-4 h-4 mr-2" />
                Contraseña
              </Label>
              <Input
                id="passwordAdmin"
                type="password"
                placeholder="••••••••"
                {...register('passwordAdmin')}
                className="h-12 text-lg"
              />
              {errors.passwordAdmin && (
                <p className="text-sm text-destructive">{errors.passwordAdmin.message}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Creando tu empresa...
                </>
              ) : (
                'Crear mi taller en FixTrack Pro'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-primary font-semibold hover:underline">
                Iniciar sesión
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}