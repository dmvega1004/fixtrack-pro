# 🔍 Guía: Cómo Verificar Datos en la Base de Datos

Esta guía te muestra **4 formas diferentes** de verificar que los datos se crearon y guardaron correctamente en FixTrack Pro.

---

## 📋 Método 1: Script de Verificación (Recomendado)

### Ejecutar el script de verificación:

```bash
# Opción 1: Usando npm
npm run verify

# Opción 2: Directamente con Node
node prisma/verify-data.js
```

### ¿Qué muestra?
- ✅ Información completa de la Empresa (con datos actualizados)
- ✅ Detalles del Usuario Admin
- ✅ Datos del Cliente de prueba
- ✅ Información del Equipo
- ✅ Tipo de Equipo
- ✅ Relaciones entre entidades
- ✅ Resumen final

---

## 🎨 Método 2: Prisma Studio (Interfaz Visual)

### Abrir Prisma Studio:

```bash
npm run prisma:studio
```

### Pasos:
1. Se abrirá automáticamente en tu navegador (puerto 5555)
2. Verás todas las tablas de la base de datos
3. Puedes navegar y ver los datos de forma visual
4. Puedes editar, crear y eliminar registros directamente

### Ventajas:
- ✅ Interfaz gráfica intuitiva
- ✅ Ver todos los datos en una sola vista
- ✅ Editar datos directamente
- ✅ Ver relaciones entre tablas

---

## 💻 Método 3: Consulta Directa con Prisma (Node.js)

### Crear un script temporal:

```javascript
// check-data.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const empresa = await prisma.empresa.findUnique({
    where: { nit: '901618888-5' },
    include: {
      usuarios: true,
      clientes: true,
      equipos: true,
    },
  });
  
  console.log('Empresa:', empresa);
  await prisma.$disconnect();
}

check();
```

### Ejecutar:
```bash
node check-data.js
```

---

## 🗄️ Método 4: Consulta SQL Directa (PostgreSQL)

### Conectar a PostgreSQL:

```bash
# Windows (PowerShell)
psql -U postgres -d fixtrack_pro

# O usando pgAdmin o DBeaver
```

### Consultas útiles:

```sql
-- Ver todas las empresas
SELECT * FROM "Empresa";

-- Ver empresa específica
SELECT * FROM "Empresa" WHERE nit = '901618888-5';

-- Ver usuario admin
SELECT id, nombre, email, rol, "empresaId" FROM "Usuario" WHERE email = 'admin@taelco.com';

-- Ver cliente
SELECT * FROM "Cliente" WHERE nombre = 'Cliente Demo S.A.S.';

-- Ver equipo
SELECT * FROM "Equipo" WHERE "codigoQR" = 'EQ-TAELCO-001';

-- Ver relaciones (JOIN)
SELECT 
  e.nombre as empresa,
  u.email as usuario,
  c.nombre as cliente,
  eq.nombre as equipo
FROM "Empresa" e
LEFT JOIN "Usuario" u ON u."empresaId" = e.id
LEFT JOIN "Cliente" c ON c."empresaId" = e.id
LEFT JOIN "Equipo" eq ON eq."empresaId" = e.id
WHERE e.nit = '901618888-5';
```

---

## 🔄 Actualizar Datos del Seed

Si cambiaste datos en `prisma/seed.js` y quieres actualizar la base de datos:

### Opción A: Actualizar empresa existente (recomendado)

Modifica el seed para que actualice en lugar de crear:

```javascript
let empresa = await prisma.empresa.findUnique({
  where: { nit: '901618888-5' },
});

if (empresa) {
  // Actualizar empresa existente
  empresa = await prisma.empresa.update({
    where: { id: empresa.id },
    data: {
      nombre: 'TAELCO Systems',
      direccion: 'Bucaramanga, Santander',
      telefono: '+573007594787',
      email: 'taelcosystems.sas@gmail.com',
    },
  });
} else {
  // Crear nueva empresa
  empresa = await prisma.empresa.create({...});
}
```

### Opción B: Eliminar y recrear

```bash
# Eliminar datos manualmente desde Prisma Studio
# O ejecutar:
npx prisma migrate reset  # ⚠️ CUIDADO: Esto elimina TODOS los datos
npx prisma db seed        # Luego ejecutar seed nuevamente
```

---

## ✅ Checklist de Verificación

Después de ejecutar el seed, verifica:

- [ ] Empresa creada con NIT correcto: `901618888-5`
- [ ] Datos de empresa actualizados (dirección, teléfono, email)
- [ ] Usuario admin existe: `admin@taelco.com`
- [ ] Usuario vinculado a la empresa correcta
- [ ] Cliente creado: `Cliente Demo S.A.S.`
- [ ] Cliente vinculado a la empresa correcta
- [ ] Equipo creado con QR: `EQ-TAELCO-001`
- [ ] Equipo vinculado a cliente y empresa correctos
- [ ] TipoEquipo creado: `Servidor`

---

## 🐛 Solución de Problemas

### Problema: "Empresa no encontrada"
- Verifica que el NIT en el seed coincida con el de la búsqueda
- Ejecuta el seed nuevamente: `npm run seed`

### Problema: "Usuario no vinculado a empresa"
- El usuario puede estar vinculado a una empresa antigua
- Actualiza el `empresaId` del usuario manualmente o recrea el seed

### Problema: "Datos duplicados"
- El seed es idempotente, pero si cambias el NIT, creará una nueva empresa
- Considera actualizar en lugar de crear si la empresa ya existe

---

## 📝 Notas Importantes

1. **El seed es idempotente**: Puedes ejecutarlo múltiples veces sin duplicar datos (excepto si cambias identificadores únicos como NIT)

2. **Cambios en NIT**: Si cambias el NIT de la empresa, se creará una nueva empresa. Considera actualizar la existente en lugar de crear una nueva.

3. **Relaciones**: Verifica que las relaciones (empresaId, clienteId, etc.) estén correctamente vinculadas.

4. **Password del admin**: La contraseña `123456` está hasheada con bcrypt. Para verificar el login, usa el módulo de autenticación.

---

**Última actualización**: Noviembre 2024


