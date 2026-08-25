# Despliegue de FixTrack Pro

Monorepo pnpm con tres paquetes relevantes para producción:

- `packages/backend` — API NestJS (se despliega en **Railway**).
- `packages/database` — schema y migraciones de Prisma (usado por el backend en build/deploy, no se despliega solo).
- `apps/web` — frontend Next.js (se despliega en **Vercel**).

Orden de despliegue: **backend primero, luego frontend, luego actualizar `FRONTEND_URL` del backend con la URL real de Vercel** (ver paso 3).

---

## 1. Backend en Railway

### Configuración del servicio

- **Root Directory**: raíz del repo (el monorepo completo, no `packages/backend`) — el build necesita `pnpm-workspace.yaml` y el paquete `database` como hermano.
- **Install Command**: `pnpm install --frozen-lockfile` (Railway lo detecta solo si usa Nixpacks con `pnpm-lock.yaml` presente; si no, configúralo explícito).
- **Build Command**:
  ```
  pnpm --filter backend run build
  ```
  Este script ya encadena `pnpm --filter database run generate` (genera el cliente de Prisma) antes de `nest build`. Railway construye desde cero en cada deploy, así que el cliente de Prisma **no** puede asumirse cacheado — por eso el `generate` va dentro del propio script de build, no como paso manual aparte.
- **Start Command**:
  ```
  pnpm --filter database run migrate:deploy && pnpm --filter backend run start:prod
  ```
  Railway no tiene una fase de "release" separada en todos los planes, así que las migraciones se aplican **encadenadas al comando de arranque**, antes de levantar el servidor. `migrate:deploy` ejecuta `prisma migrate deploy` — aplica migraciones ya generadas contra la base de producción, es idempotente (no hace nada si no hay migraciones pendientes) y **nunca** genera ni pide migraciones nuevas como sí haría `migrate dev`. Si falla (ej. migración rota), el comando corta con código de error y Railway no levanta el proceso viejo con schema desactualizado.
- **Healthcheck Path**: `/health` (devuelve `200 { "status": "ok" }`, público, sin JWT — configúralo en Railway para que el servicio se marque "healthy" y los reinicios/deploys esperen esa señal).

### Variables de entorno (Railway → Settings → Variables)

Copia los nombres de `packages/backend/.env.example` y complétalos con valores reales de producción:

| Variable | Notas |
|---|---|
| `DATABASE_URL` | Connection string de Postgres (Supabase) |
| `JWT_SECRET` | Genera uno nuevo para producción, no reuses el de desarrollo |
| `JWT_EXPIRES_IN` | Opcional, default `8h` |
| `FRONTEND_URL` | **Provisional al desplegar backend** — ver paso 3 |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cuenta de Cloudinary |
| `PROVISIONING_KEY` | Habilita `POST /auth/register` — ver "Alta de una empresa nueva" más abajo |

`PORT` **no** se configura manualmente: Railway la inyecta automáticamente y `main.ts` ya la lee de `process.env.PORT`.

Railway provee HTTPS automático en el dominio `*.up.railway.app` (o el dominio custom que configures) — no requiere configuración adicional.

---

## Alta de una empresa nueva

`POST /auth/register` crea una `Company` (tenant) junto con su primer
usuario ADMIN. No hay pantalla de registro en el frontend — es un
procedimiento manual del operador de la plataforma, protegido por una
clave de aprovisionamiento en vez de quedar abierto al público.

### Configurar `PROVISIONING_KEY`

Se configura como cualquier otra variable de entorno del backend, en
Railway → Settings → Variables (ver tabla arriba). Genera el valor con:

```
openssl rand -base64 48
```

Sin esta variable configurada, el endpoint responde 403 siempre, sin
importar qué se envíe — no existe un modo "sin protección" para este
endpoint (ver `ProvisioningKeyGuard`).

⚠️ **Trata `PROVISIONING_KEY` como una contraseña**: no se comparte por
chat ni correo, no se pega en ningún mensaje, y no entra a Git bajo
ningún concepto (ni en un commit de ejemplo, ni en un `.env` versionado).
Compártela solo por un canal seguro (gestor de contraseñas del equipo) y
rótala si sospechas que se filtró.

### Dar de alta una empresa

```
curl -X POST https://<URL_DEL_BACKEND>/auth/register \
  -H "Content-Type: application/json" \
  -H "x-provisioning-key: <PROVISIONING_KEY>" \
  -d '{
    "companyName": "<NOMBRE_DE_LA_EMPRESA>",
    "name": "<NOMBRE_DEL_ADMINISTRADOR>",
    "email": "<CORREO_DEL_ADMINISTRADOR>",
    "password": "<CONTRASEÑA_TEMPORAL>"
  }'
```

La respuesta trae solo los datos del alta (id y nombre de la empresa,
nombre y correo del administrador) — **nunca** un token de sesión: quien
ejecuta este comando es el operador de la plataforma, no el
administrador de la empresa recién creada, y no tiene por qué quedar con
una sesión abierta dentro de los datos del cliente. El administrador
inicia sesión normalmente después, con el correo y la contraseña que le
compartas por un canal seguro.

Límite: 3 intentos por hora por IP (más estricto que el de login).
Pasado ese límite, el endpoint responde 429 hasta que se cumpla la hora.

Este comando es solo el primer paso técnico (crear el tenant y su
Admin). El procedimiento completo de activación de un cliente nuevo —
configuración de "Mi empresa", alta de personal, carga de inventario y
acompañamiento — está en la **Parte III del documento de infraestructura**
(gestión interna del equipo, fuera de este repositorio).

---

## 2. Frontend en Vercel

### Configuración del proyecto

- **Root Directory**: `apps/web` (Vercel detecta el `pnpm-workspace.yaml` en la raíz del repo y corre `pnpm install` desde ahí automáticamente).
- **Build Command**: por defecto (`next build`, ya declarado en `apps/web/package.json`) — no requiere override.
- **Output**: detectado automáticamente (framework Next.js).

### Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Notas |
|---|---|
| `BACKEND_URL` | URL pública del backend en Railway (ej. `https://fixtrack-backend.up.railway.app`). **Sin prefijo `NEXT_PUBLIC_`** — es server-only a propósito, ver `apps/web/.env.example`. |

Vercel provee HTTPS automático en `*.vercel.app` y en dominios custom.

---

## 3. Orden de despliegue y `FRONTEND_URL`

1. Despliega el backend en Railway primero, con `FRONTEND_URL` apuntando a un valor provisional (puede quedar con el default de desarrollo mientras tanto; CORS solo bloquearía llamadas *desde el navegador* al backend, que hoy no ocurren — todo el tráfico pasa por el proxy server-side de Next.js).
2. Copia la URL pública que Railway asigna al backend.
3. Despliega el frontend en Vercel con `BACKEND_URL` apuntando a esa URL de Railway.
4. Copia la URL pública que Vercel asigna al frontend.
5. Vuelve a Railway y actualiza `FRONTEND_URL` con la URL real de Vercel. Redeploy del backend para que tome la variable nueva (Railway no hace hot-reload de env vars sin redeploy).

---

## 4. Respaldo y restauración de la base de datos

Esta sección es sobre la base de **producción** (Supabase). Para cómo está
separada de la base local de desarrollo en Docker, y los candados que
impiden que los scripts destructivos del paquete (`seed:dev`,
`reset-pilot`) corran por error contra producción, ver "Entornos" en
`packages/database/README.md`.

```
pnpm --filter database run backup
```

Genera un volcado comprimido (`pg_dump -Fc`) de `DATABASE_URL` en
`backups/fixtrack-YYYY-MM-DD-HHmm.dump` (raíz del repo, fuera de git —
contiene datos de clientes). Requiere `pg_dump` instalado (`brew install
libpq` en macOS); el script avisa claramente si falta.

Corre un respaldo **antes** de cada `migrate:deploy` contra producción y
antes de correr `reset-pilot`. Instrucciones de restauración (`pg_restore`,
completo o por tabla) en `packages/database/README.md`.

---

## Notas de arquitectura relevantes para el despliegue

- **Cookie de sesión**: la cookie `fixtrack_session` la emite el propio Next.js (Route Handler `apps/web/src/app/api/auth/login/route.ts`), es `httpOnly`, `sameSite: "lax"` y `secure` en producción. Nunca viaja al dominio del backend — el servidor de Next.js la lee y reenvía el JWT como header `Authorization: Bearer` (`apps/web/src/lib/api/server-fetch.ts`). Por eso **no** se necesita `sameSite: "none"` aunque backend y frontend vivan en dominios distintos: la cookie es de un solo dominio (el de Vercel).
- **Imágenes de Cloudinary**: se muestran con `<img>` plano (fotos de OT, logo del tenant), no con `next/image`. El único uso de `next/image` es un asset local estático (`/brand/logo-sm.png`). Por eso `next.config.ts` no necesita `remotePatterns` hoy — si en el futuro se migra alguna imagen de Cloudinary a `next/image`, habrá que agregar el patrón remoto ahí.
- **Rate limiting**: `POST /auth/login` está limitado a 5 intentos por minuto por IP; `POST /auth/register` a 3 intentos por hora por IP (`@nestjs/throttler`, aplicado solo a esas rutas, no globalmente).
