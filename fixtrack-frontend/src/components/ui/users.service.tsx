// src/services/users.service.ts
import api from '@/lib/api'

export interface User {
  id: number
  nombre: string
  email: string
  rol: 'ADMIN' | 'TECNICO' | 'RECEPCION' | 'CONTABILIDAD'
  activo: boolean
  telefono?: string
}

export const usersService = {
  getUsers: async (): Promise<User[]> => {
    const { data } = await api.get('/usuarios')
    return data.data || []
  },

  createUser: async (userData: any) => {
    const { data } = await api.post('/usuarios', userData)
    return data.data
  },

  toggleUserStatus: async (id: number, activo: boolean) => {
    const { data } = await api.patch(`/usuarios/${id}/estado`, { activo })
    return data.data
  },
}