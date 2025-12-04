# 📐 FixTrack Pro - Arquitectura y Resumen del Proyecto

**Versión:** 1.0  
**Fecha:** Noviembre 2024  
**Fase:** 2 - Construcción (Inicialización)

---

## 📋 RESUMEN EJECUTIVO

### Estado Actual: ✅ **INICIALIZACIÓN COMPLETA**

Se ha completado la **Fase 2.1 - Inicialización** del backend de FixTrack Pro:

- ✅ Estructura base del proyecto creada
- ✅ Dependencias instaladas y configuradas
- ✅ Base de datos multi-tenant diseñada e implementada
- ✅ Migraciones de Prisma ejecutadas exitosamente
- ✅ Servidor Express configurado y operativo
- ✅ Arquitectura modular preparada para desarrollo

---

## 🏗️ ARQUITECTURA DEL PROYECTO

### 1. **Stack Tecnológico**

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| **Runtime** | Node.js | v18+ |
| **Framework** | Express.js | ^4.18.2 |
| **Base de Datos** | PostgreSQL | - |
| **ORM** | Prisma | ^5.7.0 |
| **Variables de Entorno** | dotenv | ^16.3.1 |
| **CORS** | cors | ^2.8.5 |
| **Driver BD** | pg | ^8.11.3 |

### 2. **Estructura de Carpetas**

```
FixTrack-Pro/
│
├── 📁 prisma/                          # Prisma ORM
│   ├── schema.prisma                   # Modelo de datos completo (multi-tenant)
│   └── migrations/                     # Migraciones de base de datos
│       └── 20251122170643_/
│           └── migration.sql           # Migración inicial aplicada
│
├── 📁 src/                             # Código fuente del backend
│   ├── 📁 config/                      # Configuraciones
│   │   ├── database.js                 # Cliente de Prisma
│   │   └── env.js                      # Variables de entorno
│   │
│   ├── 📁 modules/                     # Módulos del sistema (pendiente desarrollo)
│   │   └── [Se desarrollarán aquí]
│   │       ├── empresa/
│   │       ├── usuarios/
│   │       ├── clientes/
│   │       ├── equipos/
│   │       ├── ordenes/
│   │       ├── repuestos/
│   │       ├── adjuntos/
│   │       └── tickets/
│   │
│   ├── 📁 middlewares/                 # Middlewares Express
│   │   └── index.js                    # Exportaciones de middlewares
│   │
│   ├── 📁 utils/                       # Utilidades generales
│   │   └── index.js                    # Funciones auxiliares
│   │
│   ├── app.js                          # Configuración de Express
│   └── server.js                       # Punto de entrada del servidor
│
├── 📄 package.json                     # Dependencias y scripts npm
├── 📄 .env                             # Variables de entorno (local)
├── 📄 .env.example                     # Plantilla de variables de entorno
├── 📄 .gitignore                       # Archivos ignorados por Git
├── 📄 README.md                        # Documentación básica
└── 📄 ARCHITECTURE.md                  # Este documento
```

---

## 🗄️ ARQUITECTURA DE BASE DE DATOS (Multi-Tenant)

### Modelo de Datos Completo

#### **1. TENANCY - Empresa (Tenant)**
```
Empresa
├── id (PK)
├── nombre
├── nit (unique)
├── direccion
├── telefono
├── email
└── creadoEn
```

#### **2. USUARIOS**
```
Usuario
├── id (PK)
├── empresaId (FK → Empresa) ⚡ Multi-tenant
├── nombre
├── email (unique)
├── password
├── rol (enum: ADMIN, TECNICO, RECEPCION, CONTABILIDAD)
├── telefono
├── activo
├── creadoEn
└── actualizadoEn
```

#### **3. CLIENTES**
```
Cliente
├── id (PK)
├── empresaId (FK → Empresa) ⚡ Multi-tenant
├── nombre
├── contacto
├── telefono
├── direccion
├── email
└── creadoEn
```

#### **4. TIPOS DE EQUIPO**
```
TipoEquipo
├── id (PK)
└── nombre (unique)
```

#### **5. EQUIPOS**
```
Equipo
├── id (PK)
├── empresaId (FK → Empresa) ⚡ Multi-tenant
├── nombre
├── tipoEquipoId (FK → TipoEquipo)
├── clienteId (FK → Cliente)
├── marca
├── modelo
├── serie
├── codigoQR (unique)
├── ubicacion
├── notas
├── fechaInstalacion
├── ultimoMantenimiento
├── estado (enum: ACTIVO, INACTIVO, BAJA, EN_REPARACION)
├── creadoEn
└── actualizadoEn
```

#### **6. ORDEN DE TRABAJO (Unificada)**
```
OrdenTrabajo
├── id (PK)
├── empresaId (FK → Empresa) ⚡ Multi-tenant
├── codigo (unique)              # e.g. "ORD-000123"
├── tipo (enum: PREVENTIVO, CORRECTIVO, INSTALACION)
├── clienteId (FK → Cliente)
├── equipoId (FK → Equipo, nullable)
├── tecnicoId (FK → Usuario, nullable)
├── titulo
├── descripcion
├── observaciones
├── prioridad (enum: BAJA, MEDIA, ALTA, URGENTE)
├── estado (enum: PENDIENTE, EN_PROCESO, FINALIZADA, CANCELADA)
├── fechaInicio
├── fechaFin
├── costoEstimado
├── costoFinal
├── creadoEn
└── actualizadoEn

Relaciones:
├── adjuntos → Adjunto[]
├── repuestoUso → RepuestoOrden[]
└── statusHistory → StatusHistory[]
```

#### **7. REPUESTOS**
```
Repuesto
├── id (PK)
├── empresaId (FK → Empresa) ⚡ Multi-tenant
├── sku (unique)
├── nombre
├── descripcion
├── stock
├── precioUnit
├── creadoEn
└── actualizadoEn
```

#### **8. REPUESTO ORDEN (Tabla Intermedia)**
```
RepuestoOrden
├── id (PK)
├── ordenId (FK → OrdenTrabajo)
├── repuestoId (FK → Repuesto)
├── cantidad
├── unitPrice
├── subtotal
└── creadoEn
```

#### **9. ADJUNTOS (Evidencias)**
```
Adjunto
├── id (PK)
├── empresaId (FK → Empresa) ⚡ Multi-tenant
├── ordenId (FK → OrdenTrabajo, nullable)
├── url
├── tipo (foto, pdf, video...)
├── nombre
└── creadoEn
```

#### **10. HISTORIAL DE ESTADOS (Auditoría)**
```
StatusHistory
├── id (PK)
├── ordenId (FK → OrdenTrabajo)
├── usuarioId (FK → Usuario, nullable)
├── estadoAnterior
├── estadoNuevo
├── comentario
└── creadoEn
```

#### **11. TICKETS**
```
Ticket
├── id (PK)
├── empresaId (FK → Empresa) ⚡ Multi-tenant
├── codigo (unique)
├── clienteId (FK → Cliente)
├── tecnicoId (FK → Usuario, nullable)
├── descripcion
├── prioridad (enum: BAJA, MEDIA, ALTA, URGENTE)
├── estado (enum: ABIERTO, ASIGNADO, EN_PROCESO, FINALIZADO, CANCELADO)
├── creadoEn
└── actualizadoEn
```

### ⚡ Características Multi-Tenant

- **Aislamiento de datos:** Todos los modelos principales tienen `empresaId`
- **Índices optimizados:** Se agregaron índices en `empresaId` para consultas eficientes
- **Integridad referencial:** Foreign keys garantizan consistencia de datos
- **Escalabilidad:** Diseño preparado para múltiples empresas

---

## 🔌 ARQUITECTURA DEL BACKEND

### 1. **Punto de Entrada: `server.js`**

```javascript
Funcionalidad:
├── Carga variables de entorno (.env)
├── Importa configuración de Express (app.js)
├── Conecta a base de datos (Prisma)
├── Inicia servidor HTTP en puerto configurado
├── Manejo graceful de cierre (SIGINT, SIGTERM)
└── Logs informativos de inicio
```

### 2. **Configuración Express: `app.js`**

```javascript
Middlewares aplicados:
├── cors()                    # Cross-Origin Resource Sharing
├── express.json()            # Parser JSON
└── express.urlencoded()      # Parser URL-encoded

Rutas:
├── GET /health              # Health check endpoint
└── [Pendiente: Rutas de módulos]

Manejo de errores:
├── 404 handler              # Rutas no encontradas
└── Error handler global     # Errores no manejados
```

### 3. **Configuración: `config/`**

#### `database.js`
- Exporta instancia singleton de PrismaClient
- Conexión centralizada a la base de datos

#### `env.js`
- Centraliza variables de entorno
- Valores por defecto para desarrollo
- Variables: PORT, NODE_ENV, DATABASE_URL, JWT_SECRET

### 4. **Estructura Modular (Preparada)**

```
modules/
├── [module-name]/
│   ├── controller.js        # Lógica de controladores HTTP
│   ├── service.js           # Lógica de negocio
│   ├── repository.js        # Acceso a datos (Prisma)
│   ├── validation.js        # Validación de datos
│   ├── routes.js            # Definición de rutas
│   └── types.js             # Tipos/Interfaces (si se usa TS)
```

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### ✅ Completado

1. **Inicialización del Proyecto**
   - ✅ `package.json` creado con todas las dependencias
   - ✅ Scripts npm configurados (start, dev, prisma:*)
   - ✅ 93 paquetes npm instalados sin vulnerabilidades

2. **Base de Datos**
   - ✅ Schema Prisma completo con modelo multi-tenant
   - ✅ 11 modelos principales definidos
   - ✅ Relaciones entre modelos establecidas
   - ✅ Enums definidos (Rol, TipoOrden, Prioridad, EstadoOrden, etc.)
   - ✅ Migración inicial aplicada exitosamente
   - ✅ Cliente Prisma generado (v5.22.0)
   - ✅ Base de datos "fixtrack_pro" sincronizada

3. **Backend Base**
   - ✅ Express configurado con middlewares esenciales
   - ✅ Servidor HTTP operativo en puerto 3000
   - ✅ Health check endpoint funcional (`/health`)
   - ✅ Manejo de errores básico implementado
   - ✅ Cierre graceful del servidor configurado

4. **Estructura de Carpetas**
   - ✅ Carpetas modulares creadas
   - ✅ Configuraciones centralizadas
   - ✅ Middlewares y utils preparados

5. **Documentación**
   - ✅ README.md con instrucciones básicas
   - ✅ .env.example con plantilla de configuración
   - ✅ .gitignore configurado

### ⏳ Pendiente (Próximos Pasos)

1. **Módulos del Sistema** (Pendiente desarrollo)
   - ⏳ Módulo de Autenticación (`/api/auth`)
   - ⏳ Módulo de Empresas (`/api/empresas`)
   - ⏳ Módulo de Usuarios (`/api/usuarios`)
   - ⏳ Módulo de Clientes (`/api/clientes`)
   - ⏳ Módulo de Equipos (`/api/equipos`)
   - ⏳ Módulo de Órdenes (`/api/ordenes`)
   - ⏳ Módulo de Repuestos (`/api/repuestos`)
   - ⏳ Módulo de Adjuntos (`/api/adjuntos`)
   - ⏳ Módulo de Tickets (`/api/tickets`)

2. **Middlewares Avanzados** (Pendiente)
   - ⏳ Autenticación JWT
   - ⏳ Autorización por roles
   - ⏳ Validación de tenant (empresaId)
   - ⏳ Rate limiting
   - ⏳ Logging de requests

3. **Seguridad** (Pendiente)
   - ⏳ Hash de contraseñas (bcrypt)
   - ⏳ Tokens JWT
   - ⏳ Validación de datos de entrada
   - ⏳ Sanitización de inputs

4. **Utilidades** (Pendiente)
   - ⏳ Generación de códigos únicos (ORD-000123)
   - ⏳ Manejo de archivos/upload
   - ⏳ Helpers de fecha y formato
   - ⏳ Criptografía y utilidades de seguridad

---

## 🚀 SCRIPTS DISPONIBLES

```bash
# Desarrollo
npm start              # Inicia servidor en producción
npm run dev            # Inicia servidor con auto-reload (watch)

# Prisma
npm run prisma:generate    # Genera Prisma Client
npm run prisma:migrate     # Ejecuta migraciones
npm run prisma:studio      # Abre Prisma Studio (GUI)
```

---

## 🔗 ENDPOINTS DEFINIDOS (Por Implementar)

### Autenticación
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### Empresas (Tenant)
- `POST /api/empresas`
- `GET /api/empresas/:id`

### Usuarios
- `GET /api/usuarios`
- `POST /api/usuarios`
- `PUT /api/usuarios/:id`

### Clientes
- `GET /api/clientes`
- `POST /api/clientes`
- `PUT /api/clientes/:id`

### Equipos
- `GET /api/equipos`
- `POST /api/equipos`
- `PUT /api/equipos/:id`
- `GET /api/equipos/search/:qrOrSerial`

### Órdenes de Trabajo
- `GET /api/ordenes`
- `POST /api/ordenes`
- `GET /api/ordenes/:id`
- `PATCH /api/ordenes/:id/estado`
- `PATCH /api/ordenes/:id/asignar`

### Repuestos
- `GET /api/repuestos`
- `POST /api/repuestos`
- `PUT /api/repuestos/:id`

### RepuestoOrden
- `POST /api/ordenes/:id/repuestos`
- `DELETE /api/ordenes/:id/repuestos/:repId`

### Adjuntos
- `POST /api/adjuntos`
- `GET /api/ordenes/:id/adjuntos`

### Tickets
- `GET /api/tickets`
- `POST /api/tickets`
- `PUT /api/tickets/:id`

### Health Check (✅ Implementado)
- `GET /health` - Estado del servidor

---

## 📈 PRÓXIMOS PASOS SUGERIDOS

1. **Desarrollo de Módulo de Autenticación**
   - Implementar registro y login
   - JWT tokens
   - Middleware de autenticación

2. **Desarrollo de Módulo de Empresas**
   - CRUD básico
   - Validaciones de negocio

3. **Implementar Middleware de Multi-Tenancy**
   - Extracción de empresaId del token
   - Filtrado automático por tenant

4. **Desarrollo de Módulos Restantes**
   - Seguir patrón modular establecido
   - Implementar validaciones
   - Agregar pruebas unitarias

---

## 📝 NOTAS TÉCNICAS

- **CommonJS:** El proyecto usa CommonJS (`require/module.exports`)
- **Prisma v5.22.0:** Versión actual, disponible actualización a v7.0.0
- **Puerto por defecto:** 3000 (configurable en .env)
- **Base de datos:** PostgreSQL (requiere conexión activa)
- **Variables de entorno:** Cargadas desde `.env` vía dotenv

---

**Documento generado:** Noviembre 2024  
**Última actualización:** Post-inicialización Fase 2.1

