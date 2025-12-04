# 🧪 Guía de Pruebas - Módulo de Autenticación

## 📋 Endpoint de Login

### URL
```
POST http://localhost:3000/api/auth/login
```

### Headers
```
Content-Type: application/json
```

### Body (JSON)
```json
{
  "email": "admin@taelco.com",
  "password": "123456"
}
```

---

## 🧪 Pruebas con Postman

### 1. Configurar Request

1. **Método**: POST
2. **URL**: `http://localhost:3000/api/auth/login`
3. **Headers**:
   - `Content-Type: application/json`
4. **Body** (raw JSON):
   ```json
   {
     "email": "admin@taelco.com",
     "password": "123456"
   }
   ```

### 2. Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {
      "id": 1,
      "nombre": "Administrador TAELCO",
      "email": "admin@taelco.com",
      "rol": "ADMIN",
      "telefono": "+57 3007594787",
      "empresa": {
        "id": 2,
        "nombre": "TAELCO Systems",
        "nit": "901618888-5"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Respuestas de Error

#### Credenciales Inválidas (401)
```json
{
  "error": "Credenciales inválidas"
}
```

#### Usuario Inactivo (403)
```json
{
  "error": "Usuario inactivo. Contacte al administrador"
}
```

#### Campos Faltantes (400)
```json
{
  "success": false,
  "error": "Email y contraseña son requeridos"
}
```

---

## 🧪 Pruebas con cURL

### Login Exitoso
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@taelco.com",
    "password": "123456"
  }'
```

### Login con Credenciales Inválidas
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@taelco.com",
    "password": "password-incorrecta"
  }'
```

### Login sin Campos
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@taelco.com"
  }'
```

---

## 🔐 Verificar Token JWT

El token JWT generado contiene el siguiente payload:

```json
{
  "id": 1,
  "email": "admin@taelco.com",
  "rol": "ADMIN",
  "empresaId": 2,
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Decodificar Token (para pruebas)

Puedes usar [jwt.io](https://jwt.io) para decodificar y verificar el token.

**Importante**: El campo `empresaId` es crítico para el multi-tenancy y debe estar presente en todas las peticiones autenticadas.

---

## ✅ Checklist de Pruebas

- [ ] Servidor iniciado (`npm start` o `npm run dev`)
- [ ] Base de datos con datos de seed
- [ ] Login exitoso con credenciales válidas
- [ ] Token JWT generado correctamente
- [ ] Token contiene: id, email, rol, empresaId
- [ ] Error 401 con contraseña incorrecta
- [ ] Error 400 con campos faltantes
- [ ] Error 403 con usuario inactivo (si aplica)

---

## 🚀 Iniciar Servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

El servidor estará disponible en: `http://localhost:3000`

---

## 📝 Notas

1. **Token Expiración**: El token es válido por 24 horas
2. **JWT_SECRET**: Asegúrate de tener configurado `JWT_SECRET` en tu archivo `.env`
3. **Password**: La contraseña del admin es `123456` (hasheada con bcrypt)
4. **Multi-tenancy**: El `empresaId` en el token es esencial para filtrar datos por tenant

---

**Última actualización**: Noviembre 2024


