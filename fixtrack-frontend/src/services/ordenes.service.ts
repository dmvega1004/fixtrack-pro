// src/services/ordenes.service.ts → VERSIÓN FINAL 100 % FUNCIONAL
import api from '@/lib/api'

export interface Orden {
  id: number
  codigo: string
  tipo: string
  titulo: string
  estado: string
  fechaCreacion: string
  cliente: { nombre: string }
  equipo?: { nombre: string }
  tecnico?: { nombre: string }
}

export const ordenesService = {
  // LISTAR órdenes
  getOrdenes: async (): Promise<Orden[]> => {
    const { data } = await api.get('/ordenes')
    return data.data || []
  },

  // CREAR orden
  createOrden: async (ordenData: any) => {
    const { data } = await api.post('/ordenes', ordenData)
    return data.data
  },

  // ACTUALIZAR orden
  updateOrden: async (id: number, ordenData: any) => {
    const { data } = await api.put(`/ordenes/${id}`, ordenData)
    return data.data
  },
}