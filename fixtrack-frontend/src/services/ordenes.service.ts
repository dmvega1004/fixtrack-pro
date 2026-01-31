// src/services/ordenes.service.ts → VERSIÓN FINAL 100 % FUNCIONAL
import api from '@/lib/api'

export interface Orden {
  id: number
  codigo: string
  tipo: string
  titulo: string
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'TERMINADO' | 'ENTREGADO' | 'CANCELADO'
  fechaCreacion: string
  cliente: { nombre: string }
  equipo?: { nombre: string }
  tecnico?: { nombre: string }
  tituloProblema: string
  descripcionProblema: string
  diagnosticoTecnico?: string
  trabajoRealizado?: string
  horasManoObra?: number
  costoManoObra?: number
  notasCliente?: string
  firmaClienteUrl?: string
  fotosUrl?: string[]
}

export interface Cliente {
  id: string
  nombre: string
}

export interface Equipo {
  id: string
  nombre: string
}

export interface Tecnico {
  id: string
  nombre: string
}

// Crear una nueva interfaz para el DTO de creación/edición
export interface CreateOrdenDTO {
  codigo: string
  clienteId: number
  equipoDescripcion?: string
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  tituloProblema: string
  descripcionProblema: string
  diagnosticoTecnico?: string
  trabajoRealizado?: string
  horasManoObra?: number
  costoManoObra?: number
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'TERMINADO' | 'ENTREGADO' | 'CANCELADO'
  notasCliente?: string
  firmaClienteUrl?: string
  fotosUrl?: string[]
  repuestosUsados?: {
    id: number
    cantidad: number
    precioUnitario: number
    nombre: string
  }[]
}

export const generateInvoice = async (ordenId: number): Promise<void> => {
  try {
    const response = await api.get<Blob>(`/ordenes/${ordenId}/factura`, {
      responseType: 'blob' as const,
    })

    const blob = response.data
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `Factura_Orden_${ordenId}.pdf`
    // Append to body to make click work in all browsers
    document.body.appendChild(a)
    a.click()
    a.remove()

    // Liberar URL temporal
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating invoice:', error)
    throw error
  }
}

export const ordenesService = {
  // LISTAR órdenes
  // LISTAR órdenes (VERSIÓN BLINDADA)
  getOrdenes: async (): Promise<Orden[]> => {
    try {
      // 1. Obtenemos la respuesta cruda de Axios
      const response = await api.get('/ordenes');
      
      // 2. Extraemos el cuerpo de la respuesta (lo que envía tu backend)
      const backendResponse = response.data; 

      // 3. Verificamos si existe la propiedad .data que es el Array
      if (backendResponse && Array.isArray(backendResponse.data)) {
        console.log("Órdenes encontradas:", backendResponse.data.length); // Log de éxito
        return backendResponse.data;
      }
      
      console.warn("La respuesta no tiene el formato esperado:", backendResponse);
      return [];
    } catch (error) {
      console.error('Error fetching órdenes:', error);
      // No lanzamos error para evitar pantalla blanca, devolvemos array vacío si falla
      return []; 
    }
  },
// CREAR orden
  createOrden: async (ordenData: any) => { // Usamos 'any' temporalmente para facilitar el mapeo
    try {
      console.log('Datos recibidos del formulario:', ordenData);

   // AQUÍ OCURRE LA MAGIA DE LA TRADUCCIÓN (VERSIÓN BLINDADA)
      const payloadBackend = {
        // 1. TÍTULO: Buscamos 'titulo', 'tituloOrden' o usamos el 'tituloProblema' como respaldo
        titulo: ordenData.titulo || ordenData.tituloOrden || ordenData.tituloProblema || 'Orden Sin Título',
        
        // 2. DESCRIPCIÓN: Buscamos variaciones comunes
        descripcion: ordenData.descripcion || ordenData.descripcionProblema || 'Sin descripción',
        
        // 3. CAMPOS TÉCNICOS
        tituloProblema: ordenData.tituloProblema || ordenData.tituloOrden || ordenData.titulo,
        descripcionProblema: ordenData.descripcionProblema || ordenData.descripcion,
        
        // 4. IDs Relacionales (Asegurar que sean números válidos)
        clienteId: Number(ordenData.clienteId),
        // Importante: Si equipoId viene vacío o 0, enviamos null
        equipoId: (ordenData.equipoId && Number(ordenData.equipoId) > 0) ? Number(ordenData.equipoId) : null,
        tecnicoId: (ordenData.tecnicoId && Number(ordenData.tecnicoId) > 0) ? Number(ordenData.tecnicoId) : null,

        // 5. Datos de relleno
        diagnosticoTecnico: ordenData.diagnosticoTecnico || '',
        trabajoRealizado: ordenData.trabajoRealizado || '',
        prioridad: ordenData.prioridad || 'MEDIA',
        tipo: ordenData.tipo || 'CORRECTIVO', 
        costoManoObra: Number(ordenData.costoManoObra) || 0,
        horasManoObra: Number(ordenData.horasManoObra) || 0,
        estado: ordenData.estado || 'PENDIENTE',
      };

      console.log('Enviando al Backend:', payloadBackend);

      const { data } = await api.post('/ordenes', payloadBackend);
      return data;
    } catch (error) {
      console.error('Error creating orden:', error);
      throw error;
    }
  },

  // ACTUALIZAR orden
  updateOrden: async (id: number, ordenData: CreateOrdenDTO) => {
    try {
      // Filtrar campos permitidos
      const camposValidos = [
        'codigo', 'clienteId', 'equipoDescripcion', 'prioridad',
        'tituloProblema', 'descripcionProblema', 'diagnosticoTecnico',
        'trabajoRealizado', 'horasManoObra', 'costoManoObra',
        'estado', 'notasCliente', 'firmaClienteUrl', 'fotosUrl', 'repuestosUsados',
      ];
      const datosFiltrados = Object.keys(ordenData)
        .filter((key) => camposValidos.includes(key))
        .reduce((obj: Record<string, any>, key) => {
          obj[key] = ordenData[key as keyof CreateOrdenDTO];
          return obj;
        }, {});

      const { data } = await api.put(`/ordenes/${id}`, datosFiltrados);
      return data;
    } catch (error) {
      console.error('Error updating orden:', error);
      throw new Error('No se pudo actualizar la orden.');
    }
  },

  // Obtener clientes
  getClientes: async (): Promise<Cliente[]> => {
    try {
      const response = await api.get('/clientes');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching clientes:', error);
      throw new Error('No se pudieron obtener los clientes.');
    }
  },

  // Obtener técnicos
  getTecnicos: async (): Promise<Tecnico[]> => {
    try {
      const response = await api.get('/usuarios?rol=TECNICO');
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching técnicos:', error);
      throw new Error('No se pudieron obtener los técnicos.');
    }
  },

  // ELIMINAR orden
  deleteOrden: async (id: number) => {
    try {
      // Llamamos al endpoint DELETE del backend
      const { data } = await api.delete(`/ordenes/${id}`);
      return data;
    } catch (error) {
      console.error('Error deleting orden:', error);
      throw new Error('No se pudo eliminar la orden.');
    }
  },
  generateInvoice,
};