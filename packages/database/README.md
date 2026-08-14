# packages/database

Schema y migraciones de Prisma. Ver `DEPLOY.md` en la raíz del repo para el
flujo de `generate` / `migrate:deploy` en despliegue.

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
