// src/pages/UsersPage.tsx → VERSIÓN FINAL 100% FUNCIONAL
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/users.service' // ← CORREGIDO
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, UserPlus, Loader2, Edit, UserX, UserCheck } from 'lucide-react'
import { UserDialog } from '@/components/users/UserDialog'
import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

export default function UsersPage() {
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null) // ← NUEVO
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.getUsers,
  })

  const handleSuccess = () => {
    setOpenDialog(false)
    setSelectedUser(null)
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const handleEdit = (user: any) => {
    setSelectedUser(user)
    setOpenDialog(true)
  }

  const handleToggleStatus = async (user: any) => {
    if (!confirm(`¿Estás seguro de ${user.activo ? 'desactivar' : 'activar'} a ${user.nombre}?`)) {
      return
    }

    try {
      await usersService.toggleUserStatus(user.id, !user.activo)
      toast({ title: user.activo ? 'Usuario desactivado' : 'Usuario activado' })
      handleSuccess()
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' })
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-3xl font-bold">Gestión de Usuarios</CardTitle>
          <Button onClick={() => {
            setSelectedUser(null)
            setOpenDialog(true)
          }} size="lg" className="gap-3">
            <UserPlus className="h-5 w-5" />
            Nuevo Usuario
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-xl">No hay usuarios registrados aún</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {user.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.rol === 'ADMIN' ? 'destructive' : 'secondary'}>
                          {user.rol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.activo ? 'default' : 'outline'}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.activo ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Desactivar usuario
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Activar usuario
                                </>
                              )}
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

      <UserDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
    </div>
  )
}