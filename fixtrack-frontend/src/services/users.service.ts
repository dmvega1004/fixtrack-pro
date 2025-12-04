// src/services/users.service.ts → VERSIÓN FINAL 100% SIN ERRORES
import api from '@/lib/api'

export interface User {
  id: number
  nombre: string
  email: string
  rol: 'ADMIN' | 'TECNICO' | 'RECEPCION' | 'CONTABILIDAD'
  activo: boolean
  telefono?: string
  empresaId: number
}

export interface CreateUserData {
  nombre: string
  email: string
  password: string
  rol: User['rol']
  telefono?: string
}

export interface UpdateUserData {
  nombre?: string
  email?: string
  password?: string
  rol?: User['rol']
  telefono?: string
  activo?: boolean
}

export const usersService = {
  getUsers: async (): Promise<User[]> => {
    const { data } = await api.get('/usuarios')
    return data.data || []
  },

  createUser: async (userData: CreateUserData): Promise<User> => {
    const { data } = await api.post('/usuarios', userData)
    return data.data
  },

  updateUser: async (id: number, userData: UpdateUserData): Promise<User> => {
    const { data } = await api.patch(`/usuarios/${id}`, userData)
    return data.data
  },

  toggleUserStatus: async (id: number, activo: boolean): Promise<User> => {
    const { data } = await api.patch(`/usuarios/${id}/estado`, { activo })
    return data.data
  },
}