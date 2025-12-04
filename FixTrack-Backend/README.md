# FixTrack Pro

Sistema SaaS multi-tenant para gestión de reparaciones, mantenimientos e instalaciones técnicas.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js (v18 o superior)
- PostgreSQL
- npm

### Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` y configurar la URL de la base de datos:
```
DATABASE_URL="postgresql://usuario:password@localhost:5432/fixtrack_pro?schema=public"
```

3. Generar cliente de Prisma:
```bash
npm run prisma:generate
```

4. Ejecutar migraciones:
```bash
npm run prisma:migrate
```

5. Iniciar servidor:
```bash
npm start
```

Para desarrollo con auto-reload:
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

Health check: `http://localhost:3000/health`

## 📁 Estructura del Proyecto

```
FixTrack-Pro/
├── prisma/
│   └── schema.prisma       # Modelo de datos multi-tenant
├── src/
│   ├── config/             # Configuraciones
│   │   ├── database.js
│   │   └── env.js
│   ├── modules/            # Módulos del sistema
│   ├── middlewares/        # Middlewares
│   ├── utils/              # Utilidades
│   ├── app.js              # Configuración Express
│   └── server.js           # Punto de entrada
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 📋 Scripts Disponibles

- `npm start` - Inicia el servidor
- `npm run dev` - Inicia con auto-reload (watch mode)
- `npm run prisma:generate` - Genera el cliente de Prisma
- `npm run prisma:migrate` - Ejecuta migraciones
- `npm run prisma:studio` - Abre Prisma Studio

## 🏗️ Arquitectura

- **Backend**: Node.js + Express
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Arquitectura**: Multi-tenant (cada empresa tiene datos aislados)
- **Patrón**: Modular (cada módulo tiene controller, service, repository)

## 📚 Módulos del Sistema

- Empresas (Tenants)
- Usuarios
- Clientes
- Equipos
- Tipos de Equipo
- Órdenes de Trabajo
- Repuestos
- Adjuntos
- Tickets
- Historial de Estados

## 🔐 Seguridad

- Multi-tenancy implementado a nivel de base de datos
- Autenticación y autorización por roles (ADMIN, TECNICO, RECEPCION, CONTABILIDAD)

## 📝 Notas

Este proyecto está en Fase 2 (Construcción). La estructura base está lista para comenzar el desarrollo de los módulos.

