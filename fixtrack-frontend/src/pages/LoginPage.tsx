// src/pages/LoginPage.tsx → VERSIÓN FINAL 100% CORREGIDA Y PROFESIONAL
import { useState } from 'react'
import { useAuthStore } from '@/store/auth' // ← RUTA CORRECTA (alias @)
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, ClipboardList } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@fixtrackpro.com')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('') // ← Mensaje de error en UI

  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(email, password)
      navigate('/app/dashboard', { replace: true })
    } catch (error: any) {
      setError(error.response?.data?.error || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="flex flex-col items-center space-y-4 pt-8 pb-4">
          <div className="p-3 bg-indigo-600 rounded-full shadow-lg">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-center">FixTrack Pro</CardTitle>
            <p className="text-muted-foreground mt-2 text-center text-sm">Sistema de Gestión Técnica</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@taller.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* BOTÓN CORREGIDO: SIN FRAGMENTO → NO HAY removeChild */}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Ingresando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>

        {/* MENSAJE DE ERROR BONITO */}
        {error && (
          <CardFooter className="flex justify-center pb-6">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}