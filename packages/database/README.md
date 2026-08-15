# packages/database

Schema y migraciones de Prisma. Ver `DEPLOY.md` en la raíz del repo para el
flujo de `generate` / `migrate:deploy` en despliegue.

## Entornos

Hay **dos bases de datos completamente separadas**:

- **Local (desarrollo)**: PostgreSQL corriendo en Docker en tu máquina
  (`docker-compose.yml`, raíz del repo). Vacía hasta que corres las
  migraciones y el seed — ver más abajo. Nadie más la ve; se puede borrar y
  recrear sin consecuencias.
- **Supabase (producción)**: la base real, con los clientes y la cartera de
  TAELCO. Accesible **solo** desde las variables de entorno configuradas en
  Railway (`DATABASE_URL` del servicio backend) — nunca desde un `.env` de
  este repo, ni de este equipo, ni de ningún otro.

Antes de esta separación, desarrollo y producción compartían la misma base
de Supabase: cada prueba local escribía sobre datos reales. Ya no.

### Levantar y detener la base local

```
pnpm run db:levantar   # levanta el contenedor (docker compose up -d)
pnpm run db:detener    # lo detiene, conserva los datos
pnpm run db:borrar     # lo detiene Y borra el volumen — pierdes todos los datos locales
```

**Si el puerto 5432 ya está ocupado** (por ejemplo, tienes un PostgreSQL
instalado directamente en tu Mac corriendo como servicio): párralo antes de
levantar el contenedor, o cambia el puerto publicado en
`docker-compose.yml` (`"5432:5432"` → `"5433:5432"`, por ejemplo) y ajusta
el puerto en tu `DATABASE_URL` para que coincida.

### Cómo saber a cuál base estás apuntando

Los scripts destructivos del paquete (`seed:dev`, `reset-pilot`) siempre
imprimen el host de destino como primera línea, antes de hacer nada más:

```
>> Base de datos destino: localhost
```

Si alguna vez tienes dudas fuera de esos scripts, revisa el host en
`DATABASE_URL` de tu `.env` — `localhost` es la base local, cualquier otra
cosa (ej. `*.pooler.supabase.com`) es producción.

### Usuarios y contraseñas de desarrollo

Después de correr `pnpm --filter database run seed:dev` (ver sección
"Escenario de desarrollo" más abajo), la aplicación local tiene estos
usuarios, todos con la misma contraseña:

| Correo | Rol | Contraseña |
|---|---|---|
| `admin@example.com` | ADMIN | `FixtrackDemo123!` |
| `coordinador@example.com` | COORDINATOR | `FixtrackDemo123!` |
| `tecnico@example.com` | TECHNICIAN | `FixtrackDemo123!` |

### Migraciones nuevas

Las migraciones se crean y se prueban **siempre** contra la base local
(`prisma migrate dev` apuntando a `localhost`). Solo llegan a producción
cuando ese commit se sube a `main` y Railway corre `migrate:deploy` en el
arranque (ver `DEPLOY.md`) — nunca se corre una migración a mano contra
Supabase.

### Si alguna vez hay que conectarse a producción a propósito

Ocurre — depurar un dato real, revisar un incidente. Cuando pase:

1. **Corre un respaldo primero, sin excepción**: `pnpm --filter database run backup`
   (ver sección "Respaldo" abajo). No hay excepción razonable a este paso.
2. Usa una consulta de solo lectura si es posible. Si necesitas escribir,
   confirma dos veces contra qué base estás apuntando antes de ejecutar
   nada.
3. Los scripts `seed:dev` y `reset-pilot` de este paquete **no van a dejarte
   correrlos contra producción** aunque lo intentes por error — cortan si
   `APP_ENV` no es `development` o si el host no es `localhost`/`127.0.0.1`
   (ver `scripts/guards.ts`). `backup.ts` es la única excepción a propósito:
   respaldar producción es justo lo que debe poder hacer.

## Escenario de desarrollo (seed)

```
pnpm --filter database run seed:dev
```

Requiere la base local levantada y con las migraciones aplicadas
(`pnpm --filter database run migrate:deploy`). Crea un tenant ficticio
completo — empresa, usuarios, clientes, equipos, repuestos y 12 órdenes
que cubren los casos típicos que hay que poder probar (cada estado, varios
equipos, servicio locativo, sin técnico asignado, repuestos y fotos, una
cuenta vencida, una pagada, una con abono parcial, una con cuenta de cobro
generada) — ver el código comentado en `scripts/seed-dev.ts` para el
detalle completo del escenario.

**IDEMPOTENTE**: se puede correr las veces que haga falta. Cada corrida
borra el tenant de desarrollo anterior (identificado por un id fijo) y lo
vuelve a crear desde cero — mismo resultado siempre.

⚠️ Todos los nombres son claramente ficticios a propósito (empresa
"Taller Demo FixTrack S.A.S.", clientes "Ejemplo Uno/Dos/Tres/Cuatro") y
los consecutivos de orden/cuenta de cobro arrancan en 7000/9000 — muy
distintos a los de TAELCO — para que nadie confunda esta pantalla con
datos reales.

Igual que `reset-pilot`, este script se niega a correr fuera de la base
local de desarrollo (ver "Entornos" arriba).

## Respaldo

```
pnpm --filter database run backup
```

Ejecuta `pg_dump -Fc` contra `DATABASE_URL` (leída de `packages/database/.env`,
igual que el resto de los scripts del paquete) y guarda el volcado en
`backups/fixtrack-YYYY-MM-DD-HHmm.dump`, en la raíz del repo.

- `backups/` está en `.gitignore` — el volcado trae nombres de clientes,
  NITs, montos y contraseñas hasheadas. **Nunca** debe llegar a git.
- El formato es `custom` (`-Fc`): comprimido y permite restaurar tablas
  sueltas con `pg_restore`, no solo la base entera.
- Si `pg_dump` no está instalado, el script corta con la instrucción de
  instalación (`brew install libpq` en macOS) en vez de un error críptico.
- Al terminar imprime la ruta y el tamaño del archivo — un volcado de unos
  pocos KB para una base con datos reales es señal de que algo salió mal.

Corre este comando antes de cualquier migración riesgosa, reset de datos
(`reset-pilot`) o cambio estructural grande.

## Restauración

⚠️ Un restore sobreescribe datos. Confirma primero contra qué `DATABASE_URL`
estás apuntando (`echo $DATABASE_URL` o revisa el `.env` que estés cargando)
— sobre todo si vas a restaurar contra producción.

Restore completo (todas las tablas del dump):

```
pg_restore -d "$DATABASE_URL" --clean --if-exists --no-owner --no-acl \
  backups/fixtrack-YYYY-MM-DD-HHmm.dump
```

- `--clean --if-exists`: elimina los objetos existentes antes de
  recrearlos, así el restore es repetible sin errores de "ya existe".
- `--no-owner --no-acl`: omite `OWNER TO` / `GRANT` del dump original. La
  base es Supabase — esos comandos referencian roles administrados
  (`supabase_admin`, etc.) que no siempre coinciden con el rol que usa la
  conexión al restaurar, y fallarían sin estas banderas.

Restore solo del schema de la aplicación (recomendado si estás moviendo el
respaldo a otro proyecto de Supabase — evita tocar los schemas internos
`auth`, `storage`, `graphql`, `extensions` que trae el dump completo):

```
pg_restore -d "$DATABASE_URL" --clean --if-exists --no-owner --no-acl \
  --schema=public backups/fixtrack-YYYY-MM-DD-HHmm.dump
```

Restore de una sola tabla (para recuperar un borrado puntual sin tocar el
resto de la base):

```
pg_restore -d "$DATABASE_URL" --no-owner --table=WorkOrder \
  backups/fixtrack-YYYY-MM-DD-HHmm.dump
```

Ver el contenido de un dump sin restaurar nada:

```
pg_restore -l backups/fixtrack-YYYY-MM-DD-HHmm.dump
```

`pg_restore` viene con el mismo paquete que `pg_dump` (`brew install libpq`
en macOS).
