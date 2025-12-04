// src/services/clients.service.ts

// Asegúrate de que esta importación apunte a tu instancia de Axios configurada
// (puede ser '@/lib/api' o '@/api/axios' según tu setup)
import api from '@/lib/api' 

export interface Client {
  id: number
  nombre: string
  email: string
  telefono?: string
  direccion?: string
  empresaId: number
  creadoEn: string
}

export const clientsService = {
  // LECTURA: Obtener la lista de clientes
  getClients: async (): Promise<Client[]> => {
    const { data } = await api.get('/clientes')
    return data.data || []
  },
  // CREACIÓN: Crear un nuevo cliente (Omitimos campos que vienen del backend)
  createClient: async (clientData: Omit<Client, 'id' | 'empresaId' | 'creadoEn'>) => {
    const { data } = await api.post('/clientes', clientData)
    return data.data
  },
  // ACTUALIZACIÓN: Actualizar un cliente por ID
  updateClient: async (id: number, clientData: Partial<Client>) => {
    const { data } = await api.patch(`/clientes/${id}`, clientData)
    return data.data
  },
  // ELIMINACIÓN: Borrar un cliente por ID
  deleteClient: async (id: number) => {
    await api.delete(`/clientes/${id}`)
  },
}